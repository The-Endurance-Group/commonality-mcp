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
