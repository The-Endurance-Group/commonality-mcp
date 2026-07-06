import type { EnrichmentData, ProspectProfile, ToolContext } from "@commonality/shared";
import { findConnections, type ConnectionResult } from "../../services/analysis.js";
import { getEnrichedProfile } from "../../services/enrichmentCache.js";
import { findLinkedInConnectors, getCompanyEmployees } from "../../db/queries.js";

/** Turn Cassidy enrichment into the algorithm's ProspectProfile shape. */
export function toProspectProfile(e: EnrichmentData): ProspectProfile {
  return {
    name: e.name,
    title: e.title || undefined,
    company: e.company || undefined,
    almaMater: e.almaMater || undefined,
    graduationYear: e.graduationYear || undefined,
    pastCompanies: e.pastCompanies,
    currentLocation: e.currentLocation || undefined,
    bio: e.bio || undefined,
    degrees: e.degrees,
    fieldsOfStudy: e.fieldsOfStudy,
    connectionCount: e.connectionCount,
  };
}

export interface ProspectAnalysis {
  url: string;
  enriched: EnrichmentData;
  prospect: ProspectProfile;
  results: ConnectionResult[];
}

/** Enrich a prospect URL and rank the team's warm paths to them. */
export async function analyzeProspectUrl(
  url: string,
  ctx: Pick<ToolContext, "company_id">,
): Promise<ProspectAnalysis> {
  const enriched = await getEnrichedProfile(url);
  const prospect = toProspectProfile(enriched);
  const [employees, connectors] = await Promise.all([
    getCompanyEmployees(ctx.company_id),
    findLinkedInConnectors(ctx.company_id, url, enriched.name),
  ]);
  const results = findConnections(prospect, employees, connectors);
  return { url, enriched, prospect, results };
}

// The enrichment call already fetches school, past companies, location, and
// bio - surface them instead of silently dropping them, so a follow-up like
// "where did they go to school?" can be answered without a second lookup.
// Keep it short; this is a summary, not the full profile dump.
export function summarizeBackground(e: EnrichmentData): string {
  const parts: string[] = [];
  if (e.almaMater) {
    const degree = e.degrees?.length ? e.degrees.join("/") : undefined;
    const field = e.fieldsOfStudy?.length ? e.fieldsOfStudy.join("/") : undefined;
    const study = [degree, field].filter(Boolean).join(" in ");
    parts.push(
      `Studied${study ? ` ${study}` : ""} at ${e.almaMater}${e.graduationYear ? ` ('${e.graduationYear.slice(-2)})` : ""}`,
    );
  }
  if (e.pastCompanies?.length) parts.push(`Previously at ${e.pastCompanies.join(", ")}`);
  if (e.currentLocation) parts.push(`Based in ${e.currentLocation}`);
  if (e.connectionCount) parts.push(`${e.connectionCount} LinkedIn connections`);
  if (e.bio) parts.push(e.bio);
  return parts.length ? `\n${parts.join(" - ")}` : "";
}

// Every returned person's name should be paired with their LinkedIn URL so
// it's clickable - summarizePath names a teammate (r.employee), so include
// their linkedinUrl whenever we have it.
/** One-line description of a warm path's shared signals. */
export function summarizePath(r: ConnectionResult): string {
  const sig = r.commonalities
    .map((c) => {
      if (c.type === "alma_mater") return `${c.value} alumni`;
      if (c.type === "company") return `both at ${c.value}`;
      if (c.type === "linkedin_connection") return "1st-degree LinkedIn connection";
      return `both in ${c.value}`;
    })
    .join("; ");
  const name = r.employee.linkedinUrl ? `${r.employee.name} (${r.employee.linkedinUrl})` : r.employee.name;
  return `${name} - ${sig} (score ${r.strengthScore})`;
}
