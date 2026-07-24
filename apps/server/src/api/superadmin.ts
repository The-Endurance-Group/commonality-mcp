import { Router, type Router as RouterType } from "express";
import { PLAN_LIMITS, currentMonth } from "../auth/quota.js";
import { db } from "../db/client.js";

// Cross-company console for superadmins only (config.superadminEmails - see
// oauth/jwt.ts's is_superadmin claim). Every route here deliberately bypasses
// normal company_id tenant scoping, using the service-role db client
// directly - that's the entire point of this router, not an oversight.
export const superadminRouter: RouterType = Router();

superadminRouter.use((req, res, next) => {
  if (!req.user?.is_superadmin) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
});

interface CompanyRow {
  id: string;
  name: string;
  plan: "free" | "pro";
  domain: string | null;
  created_at: string;
}

// GET /api/superadmin/companies - every company, with team size and this
// month's credit usage.
superadminRouter.get("/companies", async (_req, res) => {
  const { data: companies, error } = await db()
    .from("companies")
    .select("id, name, plan, domain, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    res.status(502).json({ error: "companies_fetch_failed", message: error.message });
    return;
  }
  const rows = (companies as CompanyRow[] | null) ?? [];
  const companyIds = rows.map((c) => c.id);

  const [{ data: users }, { data: usage }] = await Promise.all([
    companyIds.length
      ? db().from("users").select("id, company_id").in("company_id", companyIds)
      : Promise.resolve({ data: [] as { id: string; company_id: string }[] }),
    companyIds.length
      ? db()
          .from("monthly_usage")
          .select("company_id, credits_used")
          .eq("month", currentMonth())
          .in("company_id", companyIds)
      : Promise.resolve({ data: [] as { company_id: string; credits_used: number }[] }),
  ]);

  const userCountByCompany = new Map<string, number>();
  for (const u of (users as { company_id: string }[] | null) ?? []) {
    userCountByCompany.set(u.company_id, (userCountByCompany.get(u.company_id) ?? 0) + 1);
  }
  const usedByCompany = new Map(
    ((usage as { company_id: string; credits_used: number }[] | null) ?? []).map((u) => [u.company_id, u.credits_used]),
  );

  res.json({
    companies: rows.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      plan: c.plan,
      created_at: c.created_at,
      user_count: userCountByCompany.get(c.id) ?? 0,
      credits_used: usedByCompany.get(c.id) ?? 0,
      credits_limit: PLAN_LIMITS[c.plan],
    })),
  });
});

// GET /api/superadmin/companies/:id/users - roster for one company (email, role).
superadminRouter.get("/companies/:id/users", async (req, res) => {
  const { data, error } = await db()
    .from("users")
    .select("id, email, role, created_at")
    .eq("company_id", req.params.id)
    .order("created_at", { ascending: true });
  if (error) {
    res.status(502).json({ error: "users_fetch_failed", message: error.message });
    return;
  }
  res.json({ users: data ?? [] });
});

const EVENTS_PAGE_SIZE = 50;

interface CreditEventRow {
  id: string;
  user_id: string | null;
  action: string;
  target: string | null;
  created_at: string;
}

// GET /api/superadmin/companies/:id/usage-events - detailed per-event credit
// log for one company (who used a credit, when, and on what). Same shape as
// GET /api/usage/events, but keyed off the requested company rather than the
// caller's own - lets a superadmin drill into any company from the console.
superadminRouter.get("/companies/:id/usage-events", async (req, res) => {
  const companyId = req.params.id;
  const page = Math.max(0, Number(req.query.page) || 0);
  const from = page * EVENTS_PAGE_SIZE;
  const to = from + EVENTS_PAGE_SIZE - 1;

  const { data, count, error } = await db()
    .from("credit_events")
    .select("id, user_id, action, target, created_at", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) {
    res.status(502).json({ error: "usage_events_failed", message: error.message });
    return;
  }

  const events = (data as CreditEventRow[] | null) ?? [];
  const userIds = [...new Set(events.map((e) => e.user_id).filter((id): id is string => !!id))];
  const { data: users } = userIds.length
    ? await db().from("users").select("id, email").in("id", userIds)
    : { data: [] as { id: string; email: string }[] };
  const emailById = new Map((users ?? []).map((u: { id: string; email: string }) => [u.id, u.email]));

  res.json({
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      target: e.target,
      created_at: e.created_at,
      user_email: e.user_id ? (emailById.get(e.user_id) ?? null) : null,
    })),
    page,
    pageSize: EVENTS_PAGE_SIZE,
    total: count ?? events.length,
  });
});

// GET /api/superadmin/stats - platform-wide credit-event breakdown by action
// type, across every company. Selects only the `action` column and counts in
// JS (same pragmatic style as the rest of this router) rather than a
// Postgres group-by RPC.
superadminRouter.get("/stats", async (_req, res) => {
  const { data, count, error } = await db()
    .from("credit_events")
    .select("action", { count: "exact" });
  if (error) {
    res.status(502).json({ error: "stats_fetch_failed", message: error.message });
    return;
  }
  const counts = new Map<string, number>();
  for (const row of (data as { action: string }[] | null) ?? []) {
    counts.set(row.action, (counts.get(row.action) ?? 0) + 1);
  }
  const byAction = [...counts.entries()]
    .map(([action, eventCount]) => ({ action, count: eventCount }))
    .sort((a, b) => b.count - a.count);

  res.json({ total: count ?? 0, byAction });
});

// POST /api/superadmin/companies/:id/plan - directly set a company's plan.
// Bypasses Stripe entirely (comping/support override) - does NOT touch their
// Stripe subscription, so this can drift from what they're actually billed
// if they have a real paid subscription. Deliberate per product decision.
superadminRouter.post("/companies/:id/plan", async (req, res) => {
  const { plan } = (req.body ?? {}) as { plan?: string };
  if (plan !== "free" && plan !== "pro") {
    res.status(400).json({ error: "invalid_plan" });
    return;
  }
  const { error } = await db().from("companies").update({ plan }).eq("id", req.params.id);
  if (error) {
    res.status(502).json({ error: "plan_update_failed", message: error.message });
    return;
  }
  res.json({ ok: true });
});
