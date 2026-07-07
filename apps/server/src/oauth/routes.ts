import crypto from "node:crypto";
import { Router, type Router as RouterType } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { buildClerkAuthorizeUrl, exchangeClerkCode, getClerkUser } from "./clerk.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, type SignableClaims } from "./jwt.js";
import { resolveWorkspaceForEmail, WorkspaceResolutionError } from "./workspace.js";

// Commonality acts as an OAuth 2.1 authorization server that delegates user
// authentication to Clerk, then issues its own workspace-scoped access token.
//
// The flow is STATELESS: the pending-request data is packed into a signed
// `state` token sent to Clerk, and the authorization `code` is itself a signed
// token. Nothing is kept in server memory, so it survives restarts, redeploys,
// and multiple replicas.
export const oauthRouter: RouterType = Router();

const TXN_TTL_SECONDS = 10 * 60; // 10 minutes for state + code

interface StateClaims {
  purpose: "oauth_state";
  rd: string; // client redirect_uri
  st?: string; // client state
  cc?: string; // PKCE code_challenge
  ccm?: string; // PKCE method
}
interface CodeClaims {
  purpose: "oauth_code";
  claims: SignableClaims;
  cc?: string;
  ccm?: string;
  rd: string;
}

function signTxn(payload: StateClaims | CodeClaims): string {
  return jwt.sign(payload, config.jwtSecret, { algorithm: "HS256", expiresIn: TXN_TTL_SECONDS });
}
function verifyState(token: string): StateClaims {
  const d = jwt.verify(token, config.jwtSecret) as StateClaims;
  if (d.purpose !== "oauth_state") throw new Error("wrong token purpose");
  return d;
}
function verifyCode(token: string): CodeClaims {
  const d = jwt.verify(token, config.jwtSecret) as CodeClaims;
  if (d.purpose !== "oauth_code") throw new Error("wrong token purpose");
  return d;
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** PKCE S256: base64url(sha256(verifier)) must equal the stored challenge. */
function verifyPkce(challenge: string | undefined, method: string | undefined, verifier: string | undefined): boolean {
  if (!challenge) return true;
  if (!verifier) return false;
  if (method && method !== "S256") return false;
  const hash = crypto.createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(hash);
  const b = Buffer.from(challenge);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// --- Dynamic Client Registration (RFC 7591) ---------------------------------
oauthRouter.post("/register", (req, res) => {
  const body = (req.body ?? {}) as { redirect_uris?: string[]; client_name?: string };
  res.status(201).json({
    client_id: `mcp-${randomToken().slice(0, 24)}`,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    redirect_uris: body.redirect_uris ?? [],
    client_name: body.client_name,
  });
});

// --- Authorization endpoint -------------------------------------------------
oauthRouter.get("/authorize", async (req, res) => {
  const { response_type, redirect_uri, state, code_challenge, code_challenge_method } =
    req.query as Record<string, string | undefined>;

  if (response_type !== "code" || !redirect_uri) {
    res.status(400).json({ error: "invalid_request", error_description: "response_type=code and redirect_uri required" });
    return;
  }

  const stateToken = signTxn({
    purpose: "oauth_state",
    rd: redirect_uri,
    st: state,
    cc: code_challenge,
    ccm: code_challenge_method,
  });

  try {
    res.redirect(await buildClerkAuthorizeUrl(stateToken));
  } catch (err) {
    logger.error({ err }, "failed to build Clerk authorize URL");
    res.status(500).json({ error: "server_error", error_description: "auth provider unavailable" });
  }
});

// --- Clerk callback ---------------------------------------------------------
oauthRouter.get("/callback", async (req, res) => {
  const { code, state } = req.query as Record<string, string | undefined>;
  if (!code || !state) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  let pending: StateClaims;
  try {
    pending = verifyState(state);
  } catch {
    res.status(400).json({ error: "invalid_request", error_description: "unknown or expired transaction" });
    return;
  }

  const redirectBack = (params: Record<string, string>) => {
    const url = new URL(pending.rd);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (pending.st) url.searchParams.set("state", pending.st);
    res.redirect(url.toString());
  };

  try {
    const { accessToken } = await exchangeClerkCode(code);
    const user = await getClerkUser(accessToken);
    const { claims } = await resolveWorkspaceForEmail(user.email);

    const codeToken = signTxn({
      purpose: "oauth_code",
      claims,
      cc: pending.cc,
      ccm: pending.ccm,
      rd: pending.rd,
    });
    redirectBack({ code: codeToken });
  } catch (err) {
    if (err instanceof WorkspaceResolutionError) {
      redirectBack({ error: "access_denied", error_description: err.message });
      return;
    }
    logger.error({ err }, "oauth callback failed");
    redirectBack({ error: "server_error", error_description: "authentication failed" });
  }
});

// --- Token endpoint ---------------------------------------------------------
oauthRouter.post("/token", (req, res) => {
  const { grant_type, code, redirect_uri, code_verifier, refresh_token } =
    (req.body ?? {}) as Record<string, string | undefined>;

  // Refresh token grant — silent re-auth, no user interaction needed.
  if (grant_type === "refresh_token") {
    if (!refresh_token) {
      res.status(400).json({ error: "invalid_request", error_description: "refresh_token required" });
      return;
    }
    let claims: SignableClaims;
    try {
      claims = verifyRefreshToken(refresh_token);
    } catch {
      res.status(400).json({ error: "invalid_grant", error_description: "refresh token invalid or expired" });
      return;
    }
    const { token, expiresIn } = signAccessToken(claims);
    res.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: signRefreshToken(claims), // rotate: issue a fresh 30-day token
    });
    return;
  }

  if (grant_type !== "authorization_code" || !code) {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  let issued: CodeClaims;
  try {
    issued = verifyCode(code);
  } catch {
    res.status(400).json({ error: "invalid_grant", error_description: "code invalid or expired" });
    return;
  }
  if (redirect_uri && redirect_uri !== issued.rd) {
    res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
    return;
  }
  if (!verifyPkce(issued.cc, issued.ccm, code_verifier)) {
    res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    return;
  }

  const { token, expiresIn } = signAccessToken(issued.claims);
  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: signRefreshToken(issued.claims),
  });
});
