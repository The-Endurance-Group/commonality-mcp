import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../auth/middleware.js";

// REST API consumed by the React web app (companies, employees, invites, usage,
// billing). Individual routers are added in Phases 7–9. All routes require a
// valid Commonality JWT.
export const apiRouter: RouterType = Router();

apiRouter.use(requireAuth);

apiRouter.all("*", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});
