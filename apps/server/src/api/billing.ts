import { Router, type Router as RouterType } from "express";
import { config } from "../config.js";
import { createCheckoutSession, createPortalSession } from "../services/stripe.js";

export const billingRouter: RouterType = Router();

function ensureEnabled(res: Parameters<Parameters<typeof billingRouter.post>[1]>[1]): boolean {
  if (!config.stripeEnabled) {
    res.status(503).json({ error: "billing_disabled", message: "Billing is not enabled yet." });
    return false;
  }
  return true;
}

// POST /api/billing/checkout — admin starts a Pro subscription. Returns a URL.
billingRouter.post("/checkout", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (!ensureEnabled(res)) return;
  try {
    const url = await createCheckoutSession(user.company_id, user.email);
    res.json({ url });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "checkout failed" });
  }
});

// POST /api/billing/portal — admin opens the Stripe customer portal. Returns a URL.
billingRouter.post("/portal", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (!ensureEnabled(res)) return;
  try {
    const url = await createPortalSession(user.company_id);
    res.json({ url });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "portal failed" });
  }
});
