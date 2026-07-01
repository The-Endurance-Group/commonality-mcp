import { db } from "../db/client.js";
import { logger } from "../logger.js";
import { getCompanyEmployees as apifyCompanyEmployees } from "./apify.js";
import { getEnrichedProfile } from "./enrichmentCache.js";

// Builds + enriches a company's employee roster. Import creates rows quickly
// (name + url, enriched_at null); enrichment runs in the background, filling the
// denormalized columns and stamping enriched_at. The web onboarding polls
// rosterStatus() for progress.

// Team member cap by plan — matches the numbers advertised on the pricing page.
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
    // Fetch up to the highest tier's cap so we can tell whether the company
    // actually has more people than this plan's remaining slots allow.
    const fetchLimit = Math.min(input.limit ?? TEAM_LIMITS.pro, TEAM_LIMITS.pro);
    const emps = await apifyCompanyEmployees(input.companyLinkedinUrl, fetchLimit);
    available = emps.map((e) => ({ name: e.name, linkedin_url: e.linkedinUrl }));
  } else if (input.urls?.length) {
    available = input.urls.map((u) => ({ name: u, linkedin_url: u })); // name backfilled on enrichment
  }

  const trimmedByLimit = available.length > status.remaining;
  const people = available.slice(0, status.remaining);

  const imported = await upsertRoster(companyId, people);
  enrichRosterInBackground(companyId);
  return { imported, remaining: Math.max(0, status.remaining - imported), limit: status.limit, trimmedByLimit };
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
