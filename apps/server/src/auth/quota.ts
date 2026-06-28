import type { ToolContext } from "@commonality/shared";
import { db } from "../db/client.js";

// Quota: free = 10 searches lifetime, pro = 200 / calendar month.
// Checked before quota-consuming tools run; incremented atomically after success.

const PLAN_LIMITS = { free: 10, pro: 200 } as const;

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

  let used = 0;
  if (ctx.plan === "free") {
    // Lifetime: sum across all months.
    const { data } = await db()
      .from("monthly_usage")
      .select("searches_used")
      .eq("company_id", ctx.company_id);
    used = ((data as { searches_used: number }[] | null) ?? []).reduce(
      (sum, r) => sum + r.searches_used,
      0,
    );
  } else {
    const { data } = await db()
      .from("monthly_usage")
      .select("searches_used")
      .eq("company_id", ctx.company_id)
      .eq("month", currentMonth())
      .maybeSingle();
    used = (data as { searches_used: number } | null)?.searches_used ?? 0;
  }

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

/** Friendly upgrade message returned as a tool result when at limit. */
export function quotaExceededMessage(status: QuotaStatus, plan: "free" | "pro"): string {
  if (plan === "free") {
    return `You've used all ${status.limit} free searches. Upgrade to Pro for 200 searches/month — visit your Commonality dashboard → Billing to upgrade.`;
  }
  return `You've used all ${status.limit} searches this month. Your quota resets at the start of next month.`;
}
