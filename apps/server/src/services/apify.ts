import { ApifyClient } from "apify-client";
import { logger } from "../logger.js";

// Ported from the reference repo (server/services/apify.ts). LinkedIn company
// search, company-employee pull, and people search via HarvestAPI actors.
// Reads APIFY_API_KEY (or the brief's APIFY_TOKEN alias).

const COMPANY_SEARCH_ACTOR = "harvestapi/linkedin-company-search";
const COMPANY_EMPLOYEES_ACTOR = "harvestapi/linkedin-company-employees";
const PROFILE_SEARCH_ACTOR = "harvestapi/linkedin-profile-search";

// waitSecs is passed to the Apify SDK and controls how long to wait for a run to FINISH after it starts.
// It does NOT bound how long the SDK spends trying to submit/start the run — that can hang indefinitely.
// withTimeout() wraps the entire call with a hard wall-clock limit.
const SEARCH_WAIT_SECS = 8;
const EMPLOYEES_WAIT_SECS = 55;
const PROFILE_SEARCH_WAIT_SECS = 55;
const SEARCH_TIMEOUT_MS = 9_000;   // abort company search after 9 s (frontend aborts at 12 s)
const EMPLOYEES_TIMEOUT_MS = 65_000;
const PROFILE_SEARCH_TIMEOUT_MS = 65_000;

function apifyToken(): string | undefined {
  return process.env.APIFY_API_KEY ?? process.env.APIFY_TOKEN;
}

export function apifyEnabled(): boolean {
  return !!apifyToken();
}

function getClient(): ApifyClient {
  const token = apifyToken();
  if (!token) throw new Error("APIFY_API_KEY is not configured");
  // Create a fresh client per call — reusing a singleton risks stale HTTP keep-alive
  // connections that hang silently until OS TCP timeout (~75s), far exceeding our 9s limit.
  return new ApifyClient({ token });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]).finally(() => clearTimeout(timer!));
}

async function runActor(actorId: string, input: Record<string, unknown>, waitSecs: number, timeoutMs: number): Promise<any[]> {
  const run = await withTimeout(
    getClient().actor(actorId).call(input, { waitSecs }),
    timeoutMs
  );
  if (!run || run.status !== "SUCCEEDED") {
    if (!run || run.status === "TIMED-OUT") throw new Error("The lookup took too long.");
    const detail = (run as { statusMessage?: string }).statusMessage;
    throw new Error(`Lookup did not complete (status: ${run.status}${detail ? `: ${detail}` : ""}).`);
  }
  const { items } = await withTimeout(
    getClient().dataset(run.defaultDatasetId).listItems(),
    timeoutMs
  );
  return items as any[];
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

export interface ApifyCompany {
  name: string;
  description?: string;
  location?: string;
  employeeCount?: number;
  linkedinUrl: string;
}

export async function searchCompanies(name: string, limit = 6): Promise<ApifyCompany[]> {
  const items = await runActor(
    COMPANY_SEARCH_ACTOR,
    { searchQuery: name, maxItems: limit },
    SEARCH_WAIT_SECS,
    SEARCH_TIMEOUT_MS
  );
  return items
    .map((o) => {
      const loc = o.location || o.headquarters || [o.city, o.state, o.country].filter(Boolean).join(", ");
      const count = o.employeeCount ?? o.employeesCount ?? o.staffCount ?? o.numberOfEmployees;
      return {
        name: firstString(o.name, o.companyName, o.title) || "",
        description: firstString(o.description, o.tagline, o.about, o.industry),
        location: firstString(loc),
        employeeCount: typeof count === "number" ? count : (typeof count === "string" && /^\d+$/.test(count) ? Number(count) : undefined),
        linkedinUrl: firstString(o.linkedinUrl, o.url, o.companyUrl, o.link, o.profileUrl) || "",
      };
    })
    .filter((c) => c.name && c.linkedinUrl)
    .slice(0, limit);
}

export interface ApifyEmployee {
  name: string;
  title: string;
  location?: string;
  linkedinUrl: string;
}

export async function getCompanyEmployees(companyLinkedinUrl: string, limit: number): Promise<ApifyEmployee[]> {
  let items: any[];
  try {
    items = await runActor(
      COMPANY_EMPLOYEES_ACTOR,
      { companies: [companyLinkedinUrl], maxItems: limit },
      EMPLOYEES_WAIT_SECS,
      EMPLOYEES_TIMEOUT_MS
    );
  } catch (err) {
    logger.warn(err, "Apify employee pull failed");
    throw err;
  }
  const seen = new Set<string>();
  const out: ApifyEmployee[] = [];
  for (const p of items) {
    const linkedinUrl = firstString(p.linkedinUrl, p.profileUrl, p.url, p.publicProfileUrl);
    if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) continue;
    const key = linkedinUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const loc = p.location || [p.city, p.state, p.country].filter(Boolean).join(", ");
    out.push({
      name: firstString(p.name, p.fullName, `${p.firstName || ""} ${p.lastName || ""}`) || "",
      title: firstString(p.title, p.position, p.headline, p.jobTitle) || "",
      location: firstString(loc),
      linkedinUrl,
    });
    if (out.length >= limit) break;
  }
  return out.filter((e) => e.name);
}

export interface ApifyProfile {
  name: string;
  title: string;
  company?: string;
  location?: string;
  linkedinUrl: string;
}

export interface ProfileSearchFilters {
  searchQuery?: string;
  currentJobTitles?: string[];
  locations?: string[];
  currentCompanies?: string[]; // LinkedIn company page URLs
  pastCompanies?: string[];
  pastJobTitles?: string[];
  schools?: string[];
  companyHeadcount?: string[]; // human-readable LinkedIn buckets, e.g. "51-200", "10001+" — mapped to the actor's letter codes in runProfileSearch()
  companyHeadquarterLocations?: string[];
  seniorityLevelIds?: string[]; // LinkedIn seniority level IDs, e.g. "120" for "Senior"
  functionIds?: string[]; // LinkedIn job function IDs, e.g. "8" for "Engineering"
  industryIds?: string[]; // LinkedIn industry IDs (v2 taxonomy)
}

// These filters were added more recently and their exact field names/value formats
// haven't been confirmed against the actor's input schema. If the actor rejects the
// input because of one of these, retry once with all of them stripped rather than
// failing the whole search.
const ADVANCED_FILTER_KEYS: (keyof ProfileSearchFilters)[] = [
  "companyHeadcount", "companyHeadquarterLocations", "seniorityLevelIds", "functionIds", "industryIds",
];

// The actor's input schema rejects human-readable headcount ranges and instead expects
// LinkedIn's standard company-size bucket letter codes. Confirmed from a live Apify
// validation error: "Field input.companyHeadcount.0 must be equal to one of the allowed
// values: A".."I" — these map 1:1 to LinkedIn's own 9 standard headcount facets.
const COMPANY_HEADCOUNT_CODES: Record<string, string> = {
  "self-employed": "A",
  "1-10": "B",
  "11-50": "C",
  "51-200": "D",
  "201-500": "E",
  "501-1000": "F",
  "501-1,000": "F",
  "1001-5000": "G",
  "1,001-5,000": "G",
  "5001-10000": "H",
  "5,001-10,000": "H",
  "10001+": "I",
  "10,001+": "I",
};

function mapCompanyHeadcount(values: string[]): string[] {
  const mapped = values
    .map((v) => COMPANY_HEADCOUNT_CODES[v.trim().toLowerCase()])
    .filter((v): v is string => !!v);
  return mapped;
}

function isLikelyInputValidationError(err: unknown): boolean {
  const e = err as { statusCode?: number; type?: string; message?: string };
  if (e?.statusCode === 400 || e?.type === "invalid-input") return true;
  return /input schema|is not allowed|should (be|match)|invalid input|not a valid/i.test(e?.message || "");
}

// Stashed for admin debugging — the raw shape of the most recent profile-search
// result, so field-mapping issues (e.g. title/company not populating) can be
// diagnosed without direct Apify dataset access.
let lastProfileSearchRawSample: unknown;

export function getLastProfileSearchRawSample(): unknown {
  return lastProfileSearchRawSample;
}

// Direct LinkedIn people-search: returns real, currently-employed profiles matching
// LinkedIn's own job-title/location/company filters (no AI guessing involved).
// profileScraperMode "Short" returns basic profile fields incl. linkedinUrl with no
// per-profile scraping cost ($0.10/search page of up to 25 results) — the actor
// defaults to "Full" (which scrapes each profile, $0.004/profile extra).
export async function searchProfiles(filters: ProfileSearchFilters, limit = 25): Promise<ApifyProfile[]> {
  try {
    return await runProfileSearch(filters, limit);
  } catch (err) {
    const advancedKeys = ADVANCED_FILTER_KEYS.filter((k) => filters[k] !== undefined);
    if (advancedKeys.length && isLikelyInputValidationError(err)) {
      logger.warn(
        { err: err instanceof Error ? err.message : err, droppedKeys: advancedKeys },
        "Apify profile search rejected advanced filters; retrying without them"
      );
      const reduced = { ...filters };
      for (const k of advancedKeys) delete reduced[k];
      return await runProfileSearch(reduced, limit);
    }
    throw err;
  }
}

async function runProfileSearch(filters: ProfileSearchFilters, limit: number): Promise<ApifyProfile[]> {
  const actorInput: ProfileSearchFilters = { ...filters };
  if (actorInput.companyHeadcount?.length) {
    const mapped = mapCompanyHeadcount(actorInput.companyHeadcount);
    if (mapped.length) actorInput.companyHeadcount = mapped;
    else delete actorInput.companyHeadcount; // none of the values matched a known bucket — omit rather than send invalid codes
  }
  const items = await runActor(
    PROFILE_SEARCH_ACTOR,
    { ...actorInput, profileScraperMode: "Short", maxItems: limit, takePages: 1 },
    PROFILE_SEARCH_WAIT_SECS,
    PROFILE_SEARCH_TIMEOUT_MS
  );
  lastProfileSearchRawSample = items[0];
  const seen = new Set<string>();
  const out: ApifyProfile[] = [];
  for (const p of items) {
    const linkedinUrl = firstString(p.linkedinUrl, p.profileUrl, p.url, p.publicProfileUrl);
    if (!linkedinUrl || !linkedinUrl.includes("linkedin.com/in/")) continue;
    const key = linkedinUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const loc = p.location?.linkedinText || p.location || [p.city, p.state, p.country].filter(Boolean).join(", ");
    const currentPosition = p.currentPositions ?? p.currentPosition;
    const firstPosition = Array.isArray(currentPosition) ? currentPosition[0] : currentPosition;
    out.push({
      name: firstString(p.name, p.fullName, `${p.firstName || ""} ${p.lastName || ""}`) || "",
      title: firstString(
        p.title, p.position, p.headline, p.jobTitle,
        firstPosition?.title, firstPosition?.position,
        typeof currentPosition === "string" ? currentPosition : undefined
      ) || "",
      company: firstString(
        p.currentCompany?.name, p.company, p.companyName,
        firstPosition?.companyName, firstPosition?.company, firstPosition?.companyTitle
      ),
      location: firstString(loc),
      linkedinUrl,
    });
    if (out.length >= limit) break;
  }
  return out.filter((e) => e.name);
}
