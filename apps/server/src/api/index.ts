import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../auth/middleware.js";
import { billingRouter } from "./billing.js";
import { companiesRouter } from "./companies.js";
import { employeesRouter } from "./employees.js";
import { invitesRouter } from "./invites.js";
import { usageRouter } from "./usage.js";
import { usersRouter } from "./users.js";

// REST API consumed by the React web app. All routes require a valid
// Commonality JWT. (The Stripe webhook is mounted separately in index.ts with a
// raw body parser, before express.json, and is not under this router.)
export const apiRouter: RouterType = Router();

apiRouter.use(requireAuth);

apiRouter.use("/usage", usageRouter);
apiRouter.use("/companies", companiesRouter);
apiRouter.use("/employees", employeesRouter);
apiRouter.use("/invites", invitesRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/users", usersRouter);

apiRouter.all("*", (_req, res) => {
  res.status(404).json({ error: "not_found" });
});
