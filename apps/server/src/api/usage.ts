import { Router, type Router as RouterType } from "express";
import { checkQuota } from "../auth/quota.js";

export const usageRouter: RouterType = Router();

// GET /api/usage — current plan + search usage for the caller's workspace.
usageRouter.get("/", async (req, res) => {
  const user = req.user!;
  const q = await checkQuota(user);
  res.json({ plan: user.plan, ...q });
});
