import { Router, type Router as RouterType } from "express";

// OAuth authorize/token endpoints + Clerk callback + Commonality JWT issuance.
// Implemented in Phase 5. Stubbed here to establish the mount point.
export const oauthRouter: RouterType = Router();

oauthRouter.get("/authorize", (_req, res) => {
  res.status(501).json({ error: "not_implemented", phase: 5 });
});

oauthRouter.post("/token", (_req, res) => {
  res.status(501).json({ error: "not_implemented", phase: 5 });
});
