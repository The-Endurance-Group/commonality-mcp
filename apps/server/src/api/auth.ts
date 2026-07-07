import { Router, type Router as RouterType, type Request } from "express";
import { verifyClerkSessionToken } from "../auth/clerkSession.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { signAccessToken, type SignableClaims } from "../oauth/jwt.js";
import { createWorkspace, resolveWorkspaceForEmail, WorkspaceResolutionError } from "../oauth/workspace.js";

function withSuperadmin(claims: SignableClaims): SignableClaims {
  const isSuperadmin = config.superadminEmails.includes(claims.email.toLowerCase());
  return isSuperadmin ? { ...claims, is_superadmin: true } : claims;
}

// Session exchange for the first-party React app. The app authenticates the
// human with Clerk; these endpoints turn a verified Clerk session into a
// workspace-scoped Commonality JWT (the same token the MCP endpoint accepts).
export const authRouter: RouterType = Router();

class TimeoutError extends Error {}

// Bounds an entire chain of external calls (Clerk JWKS fetch, Clerk Backend
// API, Supabase) to a hard wall-clock limit, regardless of which individual
// call is slow. Observed in production: /api/auth/token hanging 50s+ even
// after adding a per-call timeout to just one of these calls - a single
// overall deadline is more robust than chasing every external call's own
// timeout behavior individually.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

const SESSION_EXCHANGE_TIMEOUT_MS = 12000;

async function clerkEmailFromRequest(req: Request): Promise<string> {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) throw new Error("missing Clerk token");
  const { email } = await verifyClerkSessionToken(token);
  return email;
}

// POST /api/auth/token - exchange a Clerk session for a Commonality JWT.
// Returns { needsOnboarding: true } when the user has no workspace yet.
authRouter.post("/token", async (req, res) => {
  let email: string;
  try {
    email = await withTimeout(clerkEmailFromRequest(req), SESSION_EXCHANGE_TIMEOUT_MS);
  } catch (err) {
    logger.error({ err }, "clerk session verification failed or timed out");
    res.status(err instanceof TimeoutError ? 504 : 401).json({ error: "invalid_clerk_session" });
    return;
  }
  try {
    const { claims, joinedExistingCompany } = await withTimeout(
      resolveWorkspaceForEmail(email),
      SESSION_EXCHANGE_TIMEOUT_MS,
    );
    const { token, expiresIn } = signAccessToken(withSuperadmin(claims));
    res.json({
      access_token: token,
      expires_in: expiresIn,
      token_type: "Bearer",
      ...(joinedExistingCompany ? { joined_existing_company: joinedExistingCompany } : {}),
    });
  } catch (err) {
    if (err instanceof WorkspaceResolutionError) {
      res.json({ needsOnboarding: true, email });
      return;
    }
    logger.error({ err, email }, "resolveWorkspaceForEmail failed or timed out");
    res.status(500).json({ error: "exchange_failed" });
  }
});

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "aol.com", "live.com", "msn.com", "protonmail.com", "proton.me", "mail.com", "gmx.com",
]);

function domainFromEmail(email: string): string | undefined {
  const d = email.split("@")[1]?.toLowerCase().trim();
  return d && !GENERIC_EMAIL_DOMAINS.has(d) ? d : undefined;
}

// POST /api/auth/onboarding - first-time admin creates their workspace.
authRouter.post("/onboarding", async (req, res) => {
  let email: string;
  try {
    email = await withTimeout(clerkEmailFromRequest(req), SESSION_EXCHANGE_TIMEOUT_MS);
  } catch (err) {
    logger.error({ err }, "clerk session verification failed or timed out");
    res.status(err instanceof TimeoutError ? 504 : 401).json({ error: "invalid_clerk_session" });
    return;
  }
  const { companyName } = (req.body ?? {}) as { companyName?: string };
  if (!companyName || !companyName.trim()) {
    res.status(400).json({ error: "companyName required" });
    return;
  }
  try {
    const claims = await withTimeout(
      createWorkspace(email, companyName.trim(), domainFromEmail(email)),
      SESSION_EXCHANGE_TIMEOUT_MS,
    );
    const { token, expiresIn } = signAccessToken(withSuperadmin(claims));
    res.status(201).json({ access_token: token, expires_in: expiresIn, token_type: "Bearer" });
  } catch (err) {
    if (err instanceof WorkspaceResolutionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    logger.error({ err, email }, "createWorkspace failed or timed out");
    res.status(500).json({ error: "onboarding_failed" });
  }
});
