import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";
import { insertLinkedinConnections } from "../db/queries.js";
import { enrichRosterInBackground, importRoster, rosterStatus, TeamLimitError } from "../services/roster.js";
import { parseConnectionsCsv } from "../services/linkedinCsv.js";

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
    const result = await importRoster(user.company_id, user.plan, { companyLinkedinUrl, urls, limit });
    res.json(result);
  } catch (err) {
    if (err instanceof TeamLimitError) {
      res.status(403).json({ error: err.message });
      return;
    }
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

// POST /api/employees/:id/connections — upload a teammate's exported
// Connections.csv. Any signed-in workspace member can do this for
// themselves or a teammate; it's optional and only strengthens 1st-degree
// warm-path matching.
employeesRouter.post("/:id/connections", async (req, res) => {
  const user = req.user!;
  const { csv } = (req.body ?? {}) as { csv?: string };
  if (!csv || typeof csv !== "string" || !csv.trim()) {
    res.status(400).json({ error: "provide csv (raw text of Connections.csv)" });
    return;
  }

  const { data: employee } = await db()
    .from("employees")
    .select("id")
    .eq("company_id", user.company_id)
    .eq("id", req.params.id)
    .maybeSingle<{ id: string }>();
  if (!employee) {
    res.status(404).json({ error: "team member not found in your workspace" });
    return;
  }

  const connections = parseConnectionsCsv(csv);
  if (!connections.length) {
    res.status(400).json({ error: "couldn't find any connections in that file — is it LinkedIn's Connections.csv?" });
    return;
  }

  try {
    const saved = await insertLinkedinConnections(user.company_id, employee.id, connections);
    res.json({ saved });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed to save connections" });
  }
});
