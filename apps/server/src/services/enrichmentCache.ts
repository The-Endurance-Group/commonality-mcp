import type { EnrichmentData } from "@commonality/shared";
import { db } from "../db/client.js";
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

  const { data: cached, error } = await supa
    .from("enrichment_cache")
    .select("*")
    .eq("linkedin_url", linkedinUrl)
    .maybeSingle<CacheRow>();

  if (error) {
    logger.warn({ err: error, linkedinUrl }, "enrichment_cache read failed; falling through to Cassidy");
  }

  if (cached && !opts.forceRefresh) {
    const age = Date.now() - new Date(cached.last_refreshed).getTime();
    if (age < FRESHNESS_MS) {
      // Fresh hit - bump the request counter, return cached data.
      await supa
        .from("enrichment_cache")
        .update({ request_count: cached.request_count + 1 })
        .eq("linkedin_url", linkedinUrl);
      return cached.enriched_data;
    }
  }

  // Miss or stale - enrich via Cassidy and upsert.
  const fresh = await analyzeLinkedInProfile(linkedinUrl);
  const { error: upsertError } = await supa.from("enrichment_cache").upsert({
    linkedin_url: linkedinUrl,
    enriched_data: fresh,
    last_refreshed: new Date().toISOString(),
    request_count: cached ? cached.request_count + 1 : 1,
  });
  if (upsertError) {
    logger.warn({ err: upsertError, linkedinUrl }, "enrichment_cache upsert failed");
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
  const urls = [...new Set(linkedinUrls)];
  if (!urls.length) return new Map();
  const { data } = await db()
    .from("enrichment_cache")
    .select("linkedin_url, enriched_data")
    .in("linkedin_url", urls);
  const rows = (data as { linkedin_url: string; enriched_data: EnrichmentData }[] | null) ?? [];
  return new Map(
    rows.map((r) => [r.linkedin_url, { name: r.enriched_data.name, title: r.enriched_data.title, company: r.enriched_data.company }]),
  );
}
