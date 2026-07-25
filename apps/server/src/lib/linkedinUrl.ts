// Single source of truth for turning a LinkedIn URL into a stable dedup/cache
// key. Used everywhere a LinkedIn URL is compared or stored as an identity:
// roster import (employees.linkedin_url), prospect unlock dedup
// (prospect_unlocks.linkedin_url), and the shared enrichment cache
// (enrichment_cache.linkedin_url). Two URL strings for the same real profile
// - differing only in case, "www.", http vs https, a trailing slash, or a
// tracking query string/fragment - must canonicalize to the same value, or
// the same person gets treated as a "new" profile: re-imported as a
// duplicate roster row, or re-billed a credit that should have been free.
export function canonicalizeLinkedInUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.toLowerCase().replace(/\/+$/, "");
    return `https://${host}${path}`;
  } catch {
    // Malformed/relative input - best-effort fallback rather than throwing.
    return raw.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}
