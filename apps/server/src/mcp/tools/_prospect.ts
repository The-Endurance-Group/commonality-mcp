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
  return { enriched, prospect, results };
}

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
  return `${r.employee.name} - ${sig} (score ${r.strengthScore})`;
}
