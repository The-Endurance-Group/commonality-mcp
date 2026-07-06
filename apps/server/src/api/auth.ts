import { Router, type Router as RouterType, type Request } from "express";
import { verifyClerkSessionToken } from "../auth/clerkSession.js";
import { signAccessToken } from "../oauth/jwt.js";
import { createWorkspace, resolveWorkspaceForEmail, WorkspaceResolutionError } from "../oauth/workspace.js";
import { getClerkUserEmail } from "../services/clerkBackend.js";

// Session exchange for the first-party React app. The app authenticates the
// human with Clerk; these endpoints turn a verified Clerk session into a
// workspace-scoped Commonality JWT (the same token the MCP endpoint accepts).
export const authRouter: RouterType = Router();

async function clerkEmailFromRequest(req: Request): Promise<string> {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) throw new Error("missing Clerk token");
  const { sub } = await verifyClerkSessionToken(token);
  return getClerkUserEmail(sub);
}

// POST /api/auth/token - exchange a Clerk session for a Commonality JWT.
// Returns { needsOnboarding: true } when the user has no workspace yet.
authRouter.post("/token", async (req, res) => {
  let email: string;
  try {
    email = await clerkEmailFromRequest(req);
  } catch {
    res.status(401).json({ error: "invalid_clerk_session" });
    return;
  }
  try {
    const { claims, joinedExistingCompany } = await resolveWorkspaceForEmail(email);
    const { token, expiresIn } = signAccessToken(claims);
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
    email = await clerkEmailFromRequest(req);
  } catch {
    res.status(401).json({ error: "invalid_clerk_session" });
    return;
  }
  const { companyName } = (req.body ?? {}) as { companyName?: string };
  if (!companyName || !companyName.trim()) {
    res.status(400).json({ error: "companyName required" });
    return;
  }
  try {
    const claims = await createWorkspace(email, companyName.trim(), domainFromEmail(email));
    const { token, expiresIn } = signAccessToken(claims);
    res.status(201).json({ access_token: token, expires_in: expiresIn, token_type: "Bearer" });
  } catch (err) {
    if (err instanceof WorkspaceResolutionError) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "onboarding_failed" });
  }
});
