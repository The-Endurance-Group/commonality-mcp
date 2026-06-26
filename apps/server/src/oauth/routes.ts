import crypto from "node:crypto";
import { Router, type Router as RouterType } from "express";
import { logger } from "../logger.js";
import { buildClerkAuthorizeUrl, exchangeClerkCode, getClerkUser } from "./clerk.js";
import { signAccessToken } from "./jwt.js";
import { putCode, putPending, takeCode, takePending } from "./store.js";
import { resolveWorkspaceForEmail, WorkspaceResolutionError } from "./workspace.js";

// Commonality acts as an OAuth 2.1 authorization server that delegates user
// authentication to Clerk, then issues its own workspace-scoped access token.
// Flow: client → /authorize → Clerk sign-in → /callback → client redirect with
// our code → /token → Commonality JWT.
export const oauthRouter: RouterType = Router();

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** PKCE S256: base64url(sha256(verifier)) must equal the stored challenge. */
function verifyPkce(
  challenge: string | undefined,
  method: string | undefined,
  verifier: string | undefined,
): boolean {
  if (!challenge) return true; // no challenge was issued
  if (!verifier) return false;
  if (method && method !== "S256") return false;
  const hash = crypto.createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(hash);
  const b = Buffer.from(challenge);
  if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
  return crypto.timingSafeEqual(a, b);
}

// --- Dynamic Client Registration (RFC 7591) ---------------------------------
// MCP clients self-register. We run public PKCE clients, so we just mint a
// client_id and echo the metadata back.
oauthRouter.post("/register", (req, res) => {
  const body = (req.body ?? {}) as { redirect_uris?: string[]; client_name?: string };
  const clientId = `mcp-${randomToken().slice(0, 24)}`;
  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
    redirect_uris: body.redirect_uris ?? [],
    client_name: body.client_name,
  });
});

// --- Authorization endpoint -------------------------------------------------
oauthRouter.get("/authorize", async (req, res) => {
  const {
    response_type,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
  } = req.query as Record<string, string | undefined>;

  if (response_type !== "code" || !redirect_uri) {
    res.status(400).json({ error: "invalid_request", error_description: "response_type=code and redirect_uri required" });
    return;
  }

  const txnId = randomToken();
  putPending(txnId, {
    clientRedirectUri: redirect_uri,
    clientState: state,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
  });

  try {
    const clerkUrl = await buildClerkAuthorizeUrl(txnId);
    res.redirect(clerkUrl);
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

  const pending = takePending(state);
  if (!pending) {
    res.status(400).json({ error: "invalid_request", error_description: "unknown or expired transaction" });
    return;
  }

  const redirectBack = (params: Record<string, string>) => {
    const url = new URL(pending.clientRedirectUri);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (pending.clientState) url.searchParams.set("state", pending.clientState);
    res.redirect(url.toString());
  };

  try {
    const { accessToken } = await exchangeClerkCode(code);
    const user = await getClerkUser(accessToken);
    const claims = await resolveWorkspaceForEmail(user.email);

    const ourCode = randomToken();
    putCode(ourCode, {
      claims,
      codeChallenge: pending.codeChallenge,
      codeChallengeMethod: pending.codeChallengeMethod,
      clientRedirectUri: pending.clientRedirectUri,
    });
    redirectBack({ code: ourCode });
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
  const { grant_type, code, redirect_uri, code_verifier } = (req.body ?? {}) as Record<string, string | undefined>;

  if (grant_type !== "authorization_code" || !code) {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  const issued = takeCode(code);
  if (!issued) {
    res.status(400).json({ error: "invalid_grant", error_description: "code invalid or expired" });
    return;
  }
  if (redirect_uri && redirect_uri !== issued.clientRedirectUri) {
    res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
    return;
  }
  if (!verifyPkce(issued.codeChallenge, issued.codeChallengeMethod, code_verifier)) {
    res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    return;
  }

  const { token, expiresIn } = signAccessToken(issued.claims);
  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
  });
});
