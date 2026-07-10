import { db } from "../db/client.js";
import { logger } from "../logger.js";
import { getCompanyEmployees as apifyCompanyEmployees } from "./apify.js";
import { getEnrichedProfile } from "./enrichmentCache.js";

// Builds + enriches a company's employee roster. Import creates rows quickly
// (name + url, enriched_at null); enrichment runs in the background, filling the
// denormalized columns and stamping enriched_at. The web onboarding polls
// rosterStatus() for progress.

// Team member cap by plan - matches the numbers advertised on the pricing page.
export const TEAM_LIMITS = { free: 25, pro: 150 } as const;

export class TeamLimitError extends Error {}

export interface TeamLimitStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function checkTeamLimit(companyId: string, plan: "free" | "pro"): Promise<TeamLimitStatus> {
  const limit = TEAM_LIMITS[plan];
  const { count } = await db().from("employees").select("id", { count: "exact", head: true }).eq("company_id", companyId);
  const used = count ?? 0;
  return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) };
}

function normUrl(u: string): string {
  return u.trim().replace(/\/+$/, "");
}

/** Insert employee rows for the given LinkedIn URLs (idempotent per company+url). */
async function upsertRoster(
  companyId: string,
  people: { name: string; linkedin_url: string }[],
): Promise<number> {
  if (!people.length) return 0;
  const rows = people.map((p) => ({
    company_id: companyId,
    name: p.name,
    linkedin_url: normUrl(p.linkedin_url),
  }));
  const { error, count } = await db()
    .from("employees")
    .upsert(rows, { onConflict: "company_id,linkedin_url", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(`roster upsert failed: ${error.message}`);
  return count ?? rows.length;
}

/** Enrich every not-yet-enriched employee for a company. Fire-and-forget. */
export function enrichRosterInBackground(companyId: string): void {
  (async () => {
    const { data: rows } = await db()
      .from("employees")
      .select("id, linkedin_url")
      .eq("company_id", companyId)
      .is("enriched_at", null);
    for (const row of (rows as { id: string; linkedin_url: string | null }[] | null) ?? []) {
      if (!row.linkedin_url) continue;
      try {
        const e = await getEnrichedProfile(row.linkedin_url);
        await db()
          .from("employees")
          .update({
            name: e.name,
            schools: e.almaMater ? e.almaMater.split(";").map((s) => s.trim()).filter(Boolean) : [],
            past_companies: e.pastCompanies,
            location: e.currentLocation ?? null,
            enriched_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      } catch (err) {
        logger.warn({ err, employeeId: row.id }, "roster enrichment failed for one profile");
      }
    }
  })().catch((err) => logger.error({ err, companyId }, "background roster enrichment crashed"));
}

/** Import from a company LinkedIn URL (via Apify) or a list of profile URLs. */
export async function importRoster(
  companyId: string,
  plan: "free" | "pro",
  input: { companyLinkedinUrl?: string; urls?: string[]; limit?: number },
): Promise<{ imported: number; remaining: number; limit: number; trimmedByLimit: boolean }> {
  const status = await checkTeamLimit(companyId, plan);
  if (!status.allowed) {
    throw new TeamLimitError(
      `Your ${plan} plan is limited to ${status.limit} team members. ` +
        (plan === "free" ? `Upgrade to Pro for up to ${TEAM_LIMITS.pro}.` : "Contact us for a custom limit."),
    );
  }

  let available: { name: string; linkedin_url: string }[] = [];

  if (input.companyLinkedinUrl) {
    // Free plan: only pull what they can actually store (≤25). Pro: pull up to
    // the plan cap so we can detect whether the company has more than fits.
    const planFetchCap = plan === "free" ? status.remaining : TEAM_LIMITS.pro;
    const fetchLimit = Math.min(input.limit ?? planFetchCap, planFetchCap);
    const emps = await apifyCompanyEmployees(input.companyLinkedinUrl, fetchLimit);
    available = emps.map((e) => ({ name: e.name, linkedin_url: e.linkedinUrl }));
  } else if (input.urls?.length) {
    available = input.urls.map((u) => ({ name: u, linkedin_url: u })); // name backfilled on enrichment
  }

  // Exclude people already on the roster before checking against the plan
  // limit - otherwise re-importing a company with mostly-existing employees
  // looks "trimmed by limit" even though every new person fit.
  const { data: existingRows } = await db()
    .from("employees")
    .select("linkedin_url")
    .eq("company_id", companyId);
  const existingUrls = new Set(
    ((existingRows as { linkedin_url: string | null }[] | null) ?? [])
      .map((r) => r.linkedin_url)
      .filter((u): u is string => !!u)
      .map(normUrl),
  );
  const newAvailable = available.filter((p) => !existingUrls.has(normUrl(p.linkedin_url)));

  const trimmedByLimit = newAvailable.length > status.remaining;
  const people = newAvailable.slice(0, status.remaining);

  const imported = await upsertRoster(companyId, people);
  // Enrichment is NOT started here - callers that want it immediately (e.g.
  // adding one person via the MCP tool) call enrichRosterInBackground()
  // themselves. The web onboarding flow instead lets the admin review/edit
  // the roster first, then explicitly kicks off enrichment.
  return { imported, remaining: Math.max(0, status.remaining - imported), limit: status.limit, trimmedByLimit };
}

/** Remove one person from a company's roster (admin action - no ownership check). */
export async function removeFromRoster(companyId: string, employeeId: string): Promise<boolean> {
  const { error, count } = await db()
    .from("employees")
    .delete({ count: "exact" })
    .eq("company_id", companyId)
    .eq("id", employeeId);
  if (error) throw new Error(`roster delete failed: ${error.message}`);
  return (count ?? 0) > 0;
}

export type ClaimResult = "ok" | "not_found" | "claimed_by_other";

/**
 * Verify a non-admin caller may act on a roster row as "themselves":
 * first-come-first-claim. If the row is unclaimed, this claims it for the
 * caller. If already claimed by the caller, succeeds. If claimed by someone
 * else, fails - the row isn't the caller's to touch via a self-service route.
 */
export async function claimEmployeeForSelf(
  companyId: string,
  employeeId: string,
  userId: string,
): Promise<ClaimResult> {
  const { data: employee } = await db()
    .from("employees")
    .select("id, claimed_by_user_id")
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .maybeSingle<{ id: string; claimed_by_user_id: string | null }>();
  if (!employee) return "not_found";
  if (employee.claimed_by_user_id === userId) return "ok";
  if (employee.claimed_by_user_id) return "claimed_by_other";

  // Conditional on still being unclaimed, so two concurrent first-claims
  // can't both "win" - only one update actually matches a row.
  const { error, count } = await db()
    .from("employees")
    .update({ claimed_by_user_id: userId }, { count: "exact" })
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .is("claimed_by_user_id", null);
  if (error) throw new Error(`claim failed: ${error.message}`);
  if (count && count > 0) return "ok";

  // Someone else claimed it in the race window between our select and update.
  const { data: recheck } = await db()
    .from("employees")
    .select("claimed_by_user_id")
    .eq("company_id", companyId)
    .eq("id", employeeId)
    .maybeSingle<{ claimed_by_user_id: string | null }>();
  return recheck?.claimed_by_user_id === userId ? "ok" : "claimed_by_other";
}

export async function rosterStatus(companyId: string): Promise<{ total: number; enriched: number }> {
  const total = await db().from("employees").select("id", { count: "exact", head: true }).eq("company_id", companyId);
  const enriched = await db()
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("enriched_at", "is", null);
  return { total: total.count ?? 0, enriched: enriched.count ?? 0 };
}
