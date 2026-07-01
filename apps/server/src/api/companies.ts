import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";
import { getCompany } from "../db/queries.js";

export const companiesRouter: RouterType = Router();

// GET /api/companies/me - the caller's workspace (non-secret fields only).
companiesRouter.get("/me", async (req, res) => {
  const company = await getCompany(req.user!.company_id);
  if (!company) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({
    id: company.id,
    name: company.name,
    plan: company.plan,
    domain: company.domain,
    context: company.context,
    website: company.website,
  });
});

// PATCH /api/companies/me - admins update context/website/domain.
companiesRouter.patch("/me", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const b = (req.body ?? {}) as Record<string, unknown>;
  const allowed = ["name", "domain", "context", "website", "linkedin_company_url"];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in b) update[k] = b[k];
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "no_updatable_fields" });
    return;
  }
  const { error } = await db().from("companies").update(update).eq("id", user.company_id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});
