import { Router, type Router as RouterType } from "express";
import { checkQuota } from "../auth/quota.js";
import { db } from "../db/client.js";

export const usageRouter: RouterType = Router();

// GET /api/usage - current plan + credit usage for the caller's workspace.
usageRouter.get("/", async (req, res) => {
  const user = req.user!;
  const q = await checkQuota(user);
  res.json({ plan: user.plan, ...q });
});

const EVENTS_PAGE_SIZE = 50;

interface CreditEventRow {
  id: string;
  user_id: string | null;
  action: string;
  target: string | null;
  created_at: string;
}

// GET /api/usage/events - superadmin-only usage log: who used a credit,
// when, and on what. Two queries + a JS join (rather than a nested
// PostgREST select) to match this codebase's existing query style (see
// db/queries.ts).
usageRouter.get("/events", async (req, res) => {
  const user = req.user!;
  if (!user.is_superadmin) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const page = Math.max(0, Number(req.query.page) || 0);
  const from = page * EVENTS_PAGE_SIZE;
  const to = from + EVENTS_PAGE_SIZE - 1;

  const { data, count, error } = await db()
    .from("credit_events")
    .select("id, user_id, action, target, created_at", { count: "exact" })
    .eq("company_id", user.company_id)
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
