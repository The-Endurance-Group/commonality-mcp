import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";
import { enrichRosterInBackground, importRoster, rosterStatus } from "../services/roster.js";

export const employeesRouter: RouterType = Router();

// GET /api/employees — the workspace roster.
employeesRouter.get("/", async (req, res) => {
  const { data, error } = await db()
    .from("employees")
    .select("id, name, linkedin_url, location, enriched_at")
    .eq("company_id", req.user!.company_id)
    .order("name");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ employees: data ?? [] });
});

// POST /api/employees/import — admins import via company URL or profile URLs.
employeesRouter.post("/import", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const { companyLinkedinUrl, urls, limit } = (req.body ?? {}) as {
    companyLinkedinUrl?: string; urls?: string[]; limit?: number;
  };
  if (!companyLinkedinUrl && !(Array.isArray(urls) && urls.length)) {
    res.status(400).json({ error: "provide companyLinkedinUrl or urls[]" });
    return;
  }
  try {
    const result = await importRoster(user.company_id, { companyLinkedinUrl, urls, limit });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "import failed" });
  }
});

// GET /api/employees/enrichment-status — onboarding progress poll.
employeesRouter.get("/enrichment-status", async (req, res) => {
  res.json(await rosterStatus(req.user!.company_id));
});

// POST /api/employees/re-enrich — admins re-run enrichment for the roster.
employeesRouter.post("/re-enrich", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  await db().from("employees").update({ enriched_at: null }).eq("company_id", user.company_id);
  enrichRosterInBackground(user.company_id);
  res.json({ ok: true });
});
