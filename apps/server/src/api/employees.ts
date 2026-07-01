import { Router, type Router as RouterType } from "express";
import { db } from "../db/client.js";
import { deleteLinkedinConnections, insertLinkedinConnections } from "../db/queries.js";
import {
  claimEmployeeForSelf,
  enrichRosterInBackground,
  importRoster,
  removeFromRoster,
  rosterStatus,
  TeamLimitError,
} from "../services/roster.js";
import { parseConnectionsCsv } from "../services/linkedinCsv.js";

export const employeesRouter: RouterType = Router();

// GET /api/employees - the workspace roster. claimedByMe/claimedByOther let
// the web UI limit self-service pickers (leave team, delete connections) to
// rows the caller can actually act on - never expose whose claim it actually is.
employeesRouter.get("/", async (req, res) => {
  const { data, error } = await db()
    .from("employees")
    .select("id, name, linkedin_url, location, schools, past_companies, enriched_at, claimed_by_user_id")
    .eq("company_id", req.user!.company_id)
    .order("name");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const userId = req.user!.user_id;
  const employees = ((data ?? []) as { claimed_by_user_id: string | null; [k: string]: unknown }[]).map((e) => {
    const { claimed_by_user_id, ...rest } = e;
    return {
      ...rest,
      claimedByMe: claimed_by_user_id === userId,
      claimedByOther: !!claimed_by_user_id && claimed_by_user_id !== userId,
    };
  });
  res.json({ employees });
});

// POST /api/employees/import - admins import via company URL or profile URLs.
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

// GET /api/employees/enrichment-status - onboarding progress poll.
employeesRouter.get("/enrichment-status", async (req, res) => {
  res.json(await rosterStatus(req.user!.company_id));
});

// POST /api/employees/start-enrichment - admins kick off enrichment once
// they're done reviewing/editing the freshly-imported roster.
employeesRouter.post("/start-enrichment", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  enrichRosterInBackground(user.company_id);
  res.json({ ok: true });
});

// DELETE /api/employees/:id - admins remove one person from the roster.
employeesRouter.delete("/:id", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const removed = await removeFromRoster(user.company_id, req.params.id);
  if (!removed) {
    res.status(404).json({ error: "team member not found in your workspace" });
    return;
  }
  res.json({ ok: true });
});

// POST /api/employees/leave - self-service: any signed-in member removes
// themselves from the roster. There's no stored email/user link on roster
// rows, so the caller picks which entry is theirs (the web app has them pick
// their own name) - claimEmployeeForSelf() verifies that row isn't already
// claimed by someone else before letting a non-admin touch it
// (first-come-first-claim; admins bypass this and can remove anyone).
employeesRouter.post("/leave", async (req, res) => {
  const user = req.user!;
  const { employeeId } = (req.body ?? {}) as { employeeId?: string };
  if (!employeeId) {
    res.status(400).json({ error: "provide employeeId" });
    return;
  }
  if (user.role !== "admin") {
    const claim = await claimEmployeeForSelf(user.company_id, employeeId, user.user_id);
    if (claim === "not_found") {
      res.status(404).json({ error: "team member not found in your workspace" });
      return;
    }
    if (claim === "claimed_by_other") {
      res.status(403).json({ error: "This roster entry is linked to a different teammate's account." });
      return;
    }
  }
  const removed = await removeFromRoster(user.company_id, employeeId);
  if (!removed) {
    res.status(404).json({ error: "team member not found in your workspace" });
    return;
  }
  res.json({ ok: true });
});

// POST /api/employees/re-enrich - admins re-run enrichment for the roster.
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

// POST /api/employees/:id/connections - upload a teammate's exported
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
    res.status(400).json({ error: "couldn't find any connections in that file - is it LinkedIn's Connections.csv?" });
    return;
  }

  try {
    const saved = await insertLinkedinConnections(user.company_id, employee.id, connections);
    res.json({ saved });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed to save connections" });
  }
});

// DELETE /api/employees/:id/connections - delete your own uploaded
// connections at any time (admins may delete anyone's). Uses the same
// first-come-first-claim ownership check as /leave, since a non-admin may
// only delete connections tied to a roster row that's theirs.
employeesRouter.delete("/:id/connections", async (req, res) => {
  const user = req.user!;
  if (user.role !== "admin") {
    const claim = await claimEmployeeForSelf(user.company_id, req.params.id, user.user_id);
    if (claim === "not_found") {
      res.status(404).json({ error: "team member not found in your workspace" });
      return;
    }
    if (claim === "claimed_by_other") {
      res.status(403).json({ error: "This roster entry is linked to a different teammate's account." });
      return;
    }
  } else {
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
  }
  try {
    const removed = await deleteLinkedinConnections(user.company_id, req.params.id);
    res.json({ removed });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed to delete connections" });
  }
});
