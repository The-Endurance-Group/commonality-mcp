import { Router, type Router as RouterType } from "express";

// OAuth 2.1 discovery endpoints. Real metadata (pointing at Clerk) is wired in
// Phase 5. Stubbed here so the mount order in index.ts is established.
export const discoveryRouter: RouterType = Router();

discoveryRouter.get("/oauth-authorization-server", (_req, res) => {
  res.status(501).json({ error: "not_implemented", phase: 5 });
});

discoveryRouter.get("/oauth-protected-resource", (_req, res) => {
  res.status(501).json({ error: "not_implemented", phase: 5 });
});
