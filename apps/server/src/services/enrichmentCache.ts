import type { EnrichmentData } from "@commonality/shared";
import { db } from "../db/client.js";
import { canonicalizeLinkedInUrl } from "../lib/linkedinUrl.js";
import { logger } from "../logger.js";
import { analyzeLinkedInProfile } from "./cassidy.js";

// NEW (not in the reference repo). The shared, cross-tenant enrichment cache.
// We hit Cassidy at most once per LinkedIn URL within the freshness window.
// The enrichment_cache table is intentionally NOT scoped by company_id - a
// profile enriched for one workspace is reusable by all.

const FRESHNESS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface CacheRow {
  linkedin_url: string;
  enriched_data: EnrichmentData;
  last_refreshed: string;
  request_count: number;
}

/**
 * Return enrichment data for a LinkedIn URL, using the shared cache when fresh.
 * On a cache hit within 90 days we return the stored data and bump request_count.
 * Otherwise we call Cassidy, upsert the result, and increment request_count.
 *
 * @param forceRefresh bypass the freshness check and re-enrich.
 */
export async function getEnrichedProfile(
  linkedinUrl: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<EnrichmentData> {
  const supa = db();
  const url = canonicalizeLinkedInUrl(linkedinUrl);

  const { data: cached, error } = await supa
    .from("enrichment_cache")
    .select("*")
    .eq("linkedin_url", url)
    .maybeSingle<CacheRow>();

  if (error) {
    logger.warn({ err: error, linkedinUrl: url }, "enrichment_cache read failed; falling through to Cassidy");
  }

  if (cached && !opts.forceRefresh) {
    const age = Date.now() - new Date(cached.last_refreshed).getTime();
    if (age < FRESHNESS_MS) {
      // Fresh hit - bump the request counter, return cached data.
      await supa
        .from("enrichment_cache")
        .update({ request_count: cached.request_count + 1 })
        .eq("linkedin_url", url);
      return cached.enriched_data;
    }
  }

  // Miss or stale - enrich via Cassidy and upsert (against the original URL -
  // Cassidy itself should get the real, unmodified link).
  const fresh = await analyzeLinkedInProfile(linkedinUrl);
  const { error: upsertError } = await supa.from("enrichment_cache").upsert({
    linkedin_url: url,
    enriched_data: fresh,
    last_refreshed: new Date().toISOString(),
    request_count: cached ? cached.request_count + 1 : 1,
  });
  if (upsertError) {
    logger.warn({ err: upsertError, linkedinUrl: url }, "enrichment_cache upsert failed");
  }
  return fresh;
}

/**
 * Look up the cached enrichment result (name/title/company) for a batch of
 * LinkedIn URLs, keyed by URL. Used to show "what Cassidy/Apify actually
 * returned" next to a usage-log row whose target is a profile URL - misses
 * (company-level targets, search-filter strings) simply aren't in the map.
 */
export async function getEnrichedNamesByUrl(
  linkedinUrls: string[],
): Promise<Map<string, Pick<EnrichmentData, "name" | "title" | "company">>> {
  // Map each original (possibly non-canonical) URL to its canonical lookup
  // key, so callers can key the returned Map by whatever raw string they
  // have on hand (e.g. a credit_events.target value) - even if two
  // different-looking targets both resolve to the same cached profile.
  const canonicalByOriginal = new Map(linkedinUrls.map((u) => [u, canonicalizeLinkedInUrl(u)]));
  const urls = [...new Set(canonicalByOriginal.values())];
  if (!urls.length) return new Map();
  const { data } = await db()
    .from("enrichment_cache")
    .select("linkedin_url, enriched_data")
    .in("linkedin_url", urls);
  const rows = (data as { linkedin_url: string; enriched_data: EnrichmentData }[] | null) ?? [];
  const byCanonical = new Map(
    rows.map((r) => [r.linkedin_url, { name: r.enriched_data.name, title: r.enriched_data.title, company: r.enriched_data.company }]),
  );
  const result = new Map<string, Pick<EnrichmentData, "name" | "title" | "company">>();
  for (const [original, canonical] of canonicalByOriginal) {
    const hit = byCanonical.get(canonical);
    if (hit) result.set(original, hit);
  }
  return result;
}
