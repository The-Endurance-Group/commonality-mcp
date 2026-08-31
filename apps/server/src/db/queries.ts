import type { Employee, EnrichmentData } from "@commonality/shared";
import { db } from "./client.js";
import { canonicalizeLinkedInUrl } from "../lib/linkedinUrl.js";

// Data access for MCP tools. The lean `employees` row holds identity + company
// scoping; the rich profile (grad year, degrees, bio, …) lives in the shared
// `enrichment_cache` keyed by linkedin_url. We join the two into the domain
// Employee the analysis algorithm consumes.

export interface CompanyRecord {
  id: string;
  name: string;
  plan: "free" | "pro";
  domain: string | null;
  context: string | null;
  website: string | null;
  linkedin_company_url: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  linkedin_url: string | null;
  schools: unknown;
  past_companies: unknown;
  location: string | null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Merge a lean employee row with its cached enrichment into a domain Employee. */
export function mapEmployee(row: EmployeeRow, enriched?: EnrichmentData): Employee {
  const schools = asStringArray(row.schools);
  return {
    id: row.id,
    name: row.name,
    linkedinUrl: row.linkedin_url,
    title: enriched?.title ?? null,
    almaMater: enriched?.almaMater ?? (schools.length ? schools.join("; ") : null),
    graduationYear: enriched?.graduationYear ?? null,
    degrees: enriched?.degrees ?? [],
    fieldsOfStudy: enriched?.fieldsOfStudy ?? [],
    pastCompanies: enriched?.pastCompanies ?? asStringArray(row.past_companies),
    currentLocation: enriched?.currentLocation ?? row.location,
    bio: enriched?.bio ?? null,
    connectionCount: enriched?.connectionCount ?? null,
  };
}

export async function getCompany(companyId: string): Promise<CompanyRecord | null> {
  const { data } = await db()
    .from("companies")
    .select("id, name, plan, domain, context, website, linkedin_company_url")
    .eq("id", companyId)
    .maybeSingle();
  return (data as CompanyRecord | null) ?? null;
}

/** All employees for a company, enriched from the shared cache where available. */
export async function getCompanyEmployees(companyId: string): Promise<Employee[]> {
  const { data: rows } = await db()
    .from("employees")
    .select("id, name, linkedin_url, schools, past_companies, location")
    .eq("company_id", companyId);
  const employees = (rows as EmployeeRow[] | null) ?? [];

  const urls = employees.map((e) => e.linkedin_url).filter((u): u is string => !!u);
  const enrichedByUrl = new Map<string, EnrichmentData>();
  if (urls.length) {
    const { data: cache } = await db()
      .from("enrichment_cache")
      .select("linkedin_url, enriched_data")
      .in("linkedin_url", urls);
    for (const c of (cache as { linkedin_url: string; enriched_data: EnrichmentData }[] | null) ?? []) {
      enrichedByUrl.set(c.linkedin_url, c.enriched_data);
    }
  }

  return employees.map((e) =>
    mapEmployee(e, e.linkedin_url ? enrichedByUrl.get(e.linkedin_url) : undefined),
  );
}

/**
 * Map of employeeId → match type for team members who have the prospect as a
 * 1st-degree LinkedIn connection (by URL or, failing that, by full name).
 */
export async function findLinkedInConnectors(
  companyId: string,
  prospectUrl: string,
  prospectName: string,
): Promise<Map<string, "url" | "name">> {
  const result = new Map<string, "url" | "name">();
  // Use the shared canonicalizer, not ad-hoc lowercase/trailing-slash
  // stripping - a stored connection URL and the prospect URL passed in here
  // routinely differ by "www.", http vs https, or a tracking query string,
  // and those need to compare equal or a real 1st-degree match gets missed.
  const urlKey = canonicalizeLinkedInUrl(prospectUrl);
  const nameKey = prospectName.trim().toLowerCase();

  const { data } = await db()
    .from("linkedin_connections")
    .select("employee_id, linkedin_url, full_name")
    .eq("company_id", companyId);
  for (const row of (data as { employee_id: string; linkedin_url: string | null; full_name: string | null }[] | null) ?? []) {
    if (row.linkedin_url && canonicalizeLinkedInUrl(row.linkedin_url) === urlKey) {
      result.set(row.employee_id, "url");
    } else if (!result.has(row.employee_id) && row.full_name && row.full_name.trim().toLowerCase() === nameKey) {
      result.set(row.employee_id, "name");
    }
  }
  return result;
}

/** Store a team member's 1st-degree LinkedIn connections (from a CSV export). */
export async function insertLinkedinConnections(
  companyId: string,
  employeeId: string,
  connections: { name?: string; url?: string; connected_on?: string }[],
): Promise<number> {
  const rows = connections
    .filter((c) => c.url || c.name)
    .map((c) => ({
      company_id: companyId,
      employee_id: employeeId,
      linkedin_url: c.url ? canonicalizeLinkedInUrl(c.url) : null,
      full_name: c.name ? c.name.trim().toLowerCase() : null,
      connected_on: c.connected_on ?? null,
    }));
  if (!rows.length) return 0;

  const { error } = await db().from("linkedin_connections").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

/** Delete every uploaded LinkedIn connection for one employee. Returns the count removed. */
export async function deleteLinkedinConnections(companyId: string, employeeId: string): Promise<number> {
  const { error, count } = await db()
    .from("linkedin_connections")
    .delete({ count: "exact" })
    .eq("company_id", companyId)
    .eq("employee_id", employeeId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** How many uploaded LinkedIn connections an employee already has - used to
 * block a silent second upload (which would just pile duplicates/wrong-file
 * rows on top, as happened when someone else's export got uploaded under
 * the wrong teammate) unless the caller explicitly confirms a replace. */
export async function countLinkedinConnections(companyId: string, employeeId: string): Promise<number> {
  const { count, error } = await db()
    .from("linkedin_connections")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("employee_id", employeeId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
