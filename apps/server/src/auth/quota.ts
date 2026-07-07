import type { ToolContext } from "@commonality/shared";
import { db } from "../db/client.js";

// Credits: 1 credit = 1 result-producing action, charged at the point of use
// rather than once per tool call. Two kinds: (1) a search (Apify actor
// invocation) always charges, every time - no caching/dedup. (2) analyzing a
// person charges 1 credit the first time a given company gets a result for a
// given LinkedIn URL, whether that result came from a fresh Cassidy call or
// the shared 90-day enrichment cache (a company always pays for its own
// first look, even if another company already paid to enrich that URL) -
// re-analyzing the same URL for the same company afterward is free forever.
// Free = 50/calendar month, Pro = 200/calendar month.

export const PLAN_LIMITS = { free: 50, pro: 200 } as const;

/** Current month as "YYYY-MM" (UTC). */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function checkQuota(ctx: Pick<ToolContext, "company_id" | "plan">): Promise<QuotaStatus> {
  const limit = PLAN_LIMITS[ctx.plan];
  const { data } = await db()
    .from("monthly_usage")
    .select("credits_used")
    .eq("company_id", ctx.company_id)
    .eq("month", currentMonth())
    .maybeSingle();
  const used = (data as { credits_used: number } | null)?.credits_used ?? 0;

  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, used, limit, remaining };
}

/** Atomically increment usage for the current month. Returns the new count. */
export async function incrementUsage(companyId: string): Promise<number> {
  const { data, error } = await db().rpc("increment_usage", {
    p_company_id: companyId,
    p_month: currentMonth(),
  });
  if (error) throw new Error(`increment_usage failed: ${error.message}`);
  return (data as number) ?? 0;
}

/** Normalize a LinkedIn URL so re-looks of the same prospect match. */
export function normalizeProspectUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

/** Has this company already paid to analyze this prospect? */
export async function isProspectUnlocked(companyId: string, url: string): Promise<boolean> {
  const { data } = await db()
    .from("prospect_unlocks")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("linkedin_url", normalizeProspectUrl(url))
    .maybeSingle();
  return !!data;
}

/** Record that this company has unlocked this prospect (idempotent). */
export async function recordProspectUnlock(companyId: string, url: string): Promise<void> {
  await db()
    .from("prospect_unlocks")
    .upsert(
      { company_id: companyId, linkedin_url: normalizeProspectUrl(url) },
      { onConflict: "company_id,linkedin_url", ignoreDuplicates: true },
    );
}

/** Record an audit-log row for one actual charge (Billing page usage log). */
async function recordCreditEvent(companyId: string, userId: string, action: string, target?: string): Promise<void> {
  await db()
    .from("credit_events")
    .insert({ company_id: companyId, user_id: userId, action, target: target ?? null });
}

/**
 * Charge 1 credit for one result-producing action - a search (Apify), or a
 * person analysis (Cassidy or a shared-cache hit; a company pays for its own
 * first look at a URL either way). Call this ONLY after the underlying call
 * has already succeeded - a failed call must never cost a credit. Call
 * checkQuota() beforehand to fail fast (skip the call entirely) when clearly
 * over limit. `action` is a short machine-readable label (e.g.
 * "analyze_prospect") shown on the Billing page's usage log; `target` is an
 * optional human-readable detail (a URL, company name, etc.) shown alongside
 * it. Pass dedupeKey (a prospect URL) for calls that should stay free on
 * repeat, same as "re-analyzing an unlocked prospect is free" - already
 * unlocked is always free, even if the company is currently over its limit,
 * since nothing new is being charged (and nothing is logged - only actual
 * charges are audited). Omit dedupeKey for calls that should always cost
 * (e.g. a fresh people-search). Known race window (check-then-increment
 * isn't one atomic statement) matches the pre-existing risk tolerance of
 * this codebase.
 */
export async function chargeCredit(
  ctx: Pick<ToolContext, "company_id" | "plan" | "user_id">,
  action: string,
  opts?: { dedupeKey?: string | null; target?: string },
): Promise<QuotaStatus> {
  const dedupeKey = opts?.dedupeKey;
  if (dedupeKey && (await isProspectUnlocked(ctx.company_id, dedupeKey))) {
    const status = await checkQuota(ctx);
    return { ...status, allowed: true };
  }
  const status = await checkQuota(ctx);
  if (!status.allowed) return status;
  const used = await incrementUsage(ctx.company_id);
  if (dedupeKey) await recordProspectUnlock(ctx.company_id, dedupeKey);
  await recordCreditEvent(ctx.company_id, ctx.user_id, action, opts?.target);
  return { allowed: true, used, limit: status.limit, remaining: Math.max(0, status.limit - used) };
}

const NOTICE_THRESHOLDS = [0.5, 0.75, 0.9, 1] as const;

/**
 * Returns a one-line notice the first time usage crosses 50/75/90/100% of
 * the plan's limit since the start of this tool call, else null. Meant to
 * replace proactively stating "X remaining" before/after every call - the
 * user only hears about it once, right as they cross a threshold.
 */
export function usageThresholdNotice(
  prevUsed: number,
  newUsed: number,
  limit: number,
  plan: "free" | "pro",
  role: "admin" | "member",
): string | null {
  if (newUsed <= prevUsed || limit <= 0) return null;
  const crossed = NOTICE_THRESHOLDS.filter((t) => prevUsed < limit * t && newUsed >= limit * t);
  if (!crossed.length) return null;
  const pct = Math.round(Math.max(...crossed) * 100);

  if (pct >= 100) {
    return plan === "free"
      ? `You've used all ${limit} credits for your ${plan} plan this month. Further tool calls will be blocked until next month, or you upgrade to Pro.`
      : `You've used all ${limit} credits for your ${plan} plan this month. Further tool calls will be blocked until it resets at the start of next month.`;
  }
  const upgradeHint =
    plan === "free"
      ? role === "admin"
        ? " Upgrade to Pro for 200 credits/month in your Commonality dashboard → Billing."
        : " Ask your workspace admin to upgrade to Pro for 200 credits/month if you need more."
      : "";
  return `Heads up: you've used ${pct}% of your credits this month (${newUsed}/${limit}).${upgradeHint}`;
}

/** Friendly upgrade message returned as a tool result when at limit. */
export function quotaExceededMessage(status: QuotaStatus, plan: "free" | "pro", role: "admin" | "member"): string {
  if (plan === "free") {
    const upgrade =
      role === "admin"
        ? "Upgrade to Pro for 200 credits/month - visit your Commonality dashboard → Billing to upgrade."
        : "Upgrade to Pro for 200 credits/month - ask your workspace admin to upgrade in Billing.";
    return `You've used all ${status.limit} free credits this month. ${upgrade}`;
  }
  return `You've used all ${status.limit} credits this month. Your quota resets at the start of next month.`;
}
