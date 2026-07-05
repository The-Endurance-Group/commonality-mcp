import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, checkQuota, isProspectUnlocked, quotaExceededMessage } from "../../auth/quota.js";
import { DEFAULT_POSTS_COUNT, MAX_POSTS_COUNT, getCompanyPosts, searchCompanies, searchProfiles } from "../../services/apify.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath, type ProspectAnalysis } from "./_prospect.js";

interface Args {
  company_url?: string;
  company_name?: string;
  role?: string[] | string;
  role_retry?: boolean;
  candidate_urls?: string[];
  confirm?: boolean;
  include_posts?: boolean;
  posts_count?: number;
}

// Seniority/level words to strip out of each role term before searching. LinkedIn's
// title filter matches literally, so a term like "VP Marketing" only catches people
// whose title contains that exact wording - missing "Director of Marketing",
// "Marketing Lead", etc. Despite tool-description instructions asking for bare
// department keywords, models don't reliably comply (observed in production: a
// "director and above" request produced the literal search term "VP Marketing" and
// returned only 1 match at a company with several marketing/sales people). Stripping
// seniority words here guarantees a broad search regardless of what the model sends;
// the model still does its own seniority filtering afterward from the returned titles.
const SENIORITY_PATTERN = new RegExp(
  "\\b(" +
    [
      "senior vice president", "executive vice president", "assistant vice president",
      "vice president", "svp", "evp", "avp", "vp",
      "senior director", "associate director", "director",
      "head of", "head",
      "chief", "president",
      "senior", "sr\\.?",
      "junior", "jr\\.?",
      "principal", "lead",
    ].join("|") +
    ")\\b",
  "gi",
);

function stripSeniority(term: string): string {
  return term.replace(SENIORITY_PATTERN, " ").replace(/\bof\b/gi, " ").replace(/\s+/g, " ").trim();
}

// Departments that are the same function in practice but don't share a literal
// substring, so a title-keyword search for one misses real people in the other
// (observed in production: searching "Sales" missed a "Vice President of Business
// Development" - neither title contains the other's word at all). Expand each
// searched term to also include its known synonyms, keyed and matched lowercase.
const DEPARTMENT_SYNONYMS: Record<string, string[]> = {
  "sales": ["business development", "biz dev"],
  "business development": ["sales"],
  "biz dev": ["sales"],
  "finance": ["accounting", "fp&a"],
  "accounting": ["finance"],
  "fp&a": ["finance"],
  "hr": ["human resources", "people", "talent", "people operations"],
  "human resources": ["hr", "people", "talent"],
  "people": ["hr", "human resources", "talent"],
  "talent": ["hr", "human resources", "people", "recruiting"],
  "recruiting": ["talent acquisition", "talent"],
  "talent acquisition": ["recruiting", "talent"],
  "it": ["information technology", "technology", "engineering"],
  "information technology": ["it", "technology"],
  "engineering": ["technology", "software", "it"],
  "technology": ["it", "engineering", "software"],
  "marketing": ["growth", "demand generation", "brand"],
  "growth": ["marketing"],
  "legal": ["compliance", "general counsel"],
  "compliance": ["legal"],
  "operations": ["ops"],
  "ops": ["operations"],
  "product": ["product management"],
  "product management": ["product"],
  "customer success": ["customer support", "client services", "account management"],
  "customer support": ["customer success", "client services"],
  "client services": ["customer success", "customer support", "account management"],
  "account management": ["customer success", "client services"],
  "procurement": ["purchasing", "sourcing"],
  "purchasing": ["procurement", "sourcing"],
};

function expandSynonyms(terms: string[]): string[] {
  const extra = terms.flatMap((t) => DEPARTMENT_SYNONYMS[t.toLowerCase()] ?? []);
  return [...terms, ...extra];
}

// role should be an array per the tool schema, but clients occasionally send a
// bare string (stale cached schema, or a model not conforming exactly) - normalize
// rather than crash on .join()/.length checks that assume an array. Also strips
// seniority words and expands known department synonyms so the search stays broad
// (see stripSeniority, expandSynonyms).
function normalizeRole(role: Args["role"]): string[] {
  if (!role) return [];
  const terms = Array.isArray(role) ? role : [role];
  const stripped = expandSynonyms(terms.map(stripSeniority).filter(Boolean));
  // dedupe case-insensitively while preserving first-seen casing
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of stripped) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

const ROLE_SEARCH_LIMIT = 25;
const MAX_CANDIDATES = 20;

// Account-based "best way into [Company]" - a multi-call flow built on top of
// the same per-prospect pipeline analyze_prospect uses (Cassidy enrich + match):
//   0. company_name, no company_url  -> resolve the name to a LinkedIn company URL
//      (or the user can paste one directly if none of the matches are right).
//      1 credit - this is a real Apify actor call, same as any other search.
//   1. company_url, no role          -> ask the user for a role, then search.
//      company_url + role            -> LinkedIn people-search scoped to that
//      company + a few broad keyword terms (e.g. "Sales", "Business
//      Development" - not full titles with seniority like "VP of Sales",
//      which only narrows the match and misses real title wording). Zero
//      results: try one reworded/broader batch of terms (role_retry:true)
//      before asking the user to revise their filters - never silently
//      falls back to an unfiltered roster. 1 credit for the search itself.
//   2. + candidate_urls              -> preview how many NEW candidates analyzing them would cover.
//   3. + candidate_urls + confirm    -> run it, charging 1 credit per new candidate, return a ranking.
//   4. + include_posts (standalone, just needs company_url) -> the company's
//      recent posts, 1 credit - opt-in only, never fetched automatically.
// Billing is handled inline throughout run() via chargeCredit(). Never state
// credit cost or remaining balance in any response here - that's only ever
// surfaced on demand via get_usage, or via the separate, deliberate
// usageThresholdNotice() system in mcp/server.ts.
export const analyze_company: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.company_url) {
      if (!args.company_name) return text("Provide the target company's LinkedIn URL or name.", true);

      const nameSearchStatus = await checkQuota(ctx);
      if (!nameSearchStatus.allowed) return text(quotaExceededMessage(nameSearchStatus, ctx.plan, ctx.role), true);

      let companies;
      try {
        companies = await searchCompanies(args.company_name);
      } catch {
        return text("Couldn't look up that company right now. Please try again.", true);
      }
      await chargeCredit(ctx);
      if (!companies.length) return text(`No company found matching "${args.company_name}".`, true);

      const lines = companies.map((c, i) => `${i + 1}. ${c.name}${c.location ? ` - ${c.location}` : ""}\n   ${c.linkedinUrl}`);
      return text(
        `Found ${companies.length} companies matching "${args.company_name}":\n${lines.join("\n")}\n\n` +
          "Confirm the right one with the user, then call analyze_company again with company_url set to it. " +
          "If none of these are the right company, ask the user to paste the correct LinkedIn company URL " +
          "themselves and call analyze_company again with that company_url instead.",
      );
    }

    if (!/linkedin\.com\/company\//i.test(args.company_url)) {
      return text(
        `"${args.company_url}" doesn't look like a LinkedIn company page URL (should contain linkedin.com/company/...). ` +
          "Don't guess one - call analyze_company with company_name instead to resolve the real URL first.",
        true,
      );
    }

    // Opt-in, standalone: recent company posts, only when explicitly requested
    // (e.g. after asking the user post-analysis and they said yes) - works
    // independent of role/candidate state, just needs company_url.
    if (args.include_posts) {
      const postsStatus = await checkQuota(ctx);
      if (!postsStatus.allowed) return text(quotaExceededMessage(postsStatus, ctx.plan, ctx.role), true);
      const count = Math.min(Math.max(args.posts_count ?? DEFAULT_POSTS_COUNT, 1), MAX_POSTS_COUNT);
      let posts;
      try {
        posts = await getCompanyPosts(args.company_url, count);
      } catch {
        return text("Couldn't fetch this company's recent posts right now. Please try again.", true);
      }
      if (!posts.length) return text("No recent public posts found for this company.");
      await chargeCredit(ctx);
      const postLines = posts.map((p, i) => `${i + 1}. ${p.postedAt ? `[${p.postedAt}] ` : ""}${p.text.slice(0, 200)}`);
      return text(`Recent company activity:\n${postLines.join("\n")}`);
    }

    if (!args.candidate_urls || args.candidate_urls.length === 0) {
      const role = normalizeRole(args.role);
      if (role.length === 0) {
        return text(
          "Ask the user what department/function (and, optionally, seniority) they want to reach - e.g. \"sales\", " +
            "\"a senior person in business development\". Then, before calling analyze_company again, follow these " +
            "steps in order: (1) list out every distinct department/function word or phrase the user used, " +
            "splitting on \"and\"/\"or\"/\"/\" - e.g. \"sales or marketing\" is 2 items, \"sales, marketing, and biz " +
            "dev\" is 3; (2) drop any seniority words (VP, Director, Head of, Senior, Chief, etc.) from each item - " +
            "apply seniority yourself later from the returned titles, never put it in the search; (3) put all " +
            "resulting items in the role array in ONE call - never search only a subset of what the user named. " +
            "Then call analyze_company with company_url + role.",
        );
      }

      const roleLabel = role.join(" / ");

      const searchStatus = await checkQuota(ctx);
      if (!searchStatus.allowed) return text(quotaExceededMessage(searchStatus, ctx.plan, ctx.role), true);

      let candidates: { name: string; title: string; linkedinUrl: string }[];
      try {
        candidates = await searchProfiles({ currentCompanies: [args.company_url], currentJobTitles: role }, ROLE_SEARCH_LIMIT);
      } catch {
        return text("Couldn't search that company's people right now. Please try again.", true);
      }
      await chargeCredit(ctx);

      if (!candidates.length) {
        if (!args.role_retry) {
          return text(
            `No matches for "${roleLabel}" at this company. Try different or broader keyword terms (a related ` +
              "department name or synonym, still no seniority words - don't ask the user yet), then call " +
              "analyze_company again with company_url + the new role terms + role_retry:true.",
          );
        }
        return text(
          `Still no matches after trying broader keyword terms. Ask the user to revise their filters - a different ` +
            "department or function entirely - then call analyze_company again with the new role terms (and " +
            "role_retry unset, to get a fresh two-try budget).",
          true,
        );
      }

      const lines = candidates.map((c, i) => `${i + 1}. ${c.name} - ${c.title}\n   ${c.linkedinUrl}`);
      return text(
        `Searched for "${roleLabel}" (title keywords, already includes related synonyms) at this company - ` +
          `${candidates.length} matches:\n${lines.join("\n")}\n\n` +
          "If the user specified a seniority (e.g. \"VP\", \"director-level\", \"senior\"), read each person's title " +
          "above and filter/reorder this list yourself to lead with the ones that actually match it, noting that you " +
          "narrowed it down - don't just dump the raw list when they asked for a seniority. When you show the " +
          "filtered/reordered list to the user, KEEP each person's LinkedIn URL next to their name exactly as shown " +
          "above - don't summarize away the URL, the user needs it to click through to the profile. If this missed a " +
          "department/function the user actually named, or the wrong departments were searched, call analyze_company " +
          "again with corrected role terms (a fresh search, no special flag needed). Otherwise, confirm with the " +
          `user which of these to analyze (up to ${MAX_CANDIDATES} at a time), then call analyze_company again with ` +
          "company_url + candidate_urls to run the analysis.",
      );
    }

    const candidateUrls = args.candidate_urls;
    if (candidateUrls.length > MAX_CANDIDATES) {
      return text(
        `That's ${candidateUrls.length} candidates, but analyze_company only handles ${MAX_CANDIDATES} at a time ` +
          "(each one takes a real search, one at a time, so a bigger batch could take several minutes). " +
          "Tell the user this and ask them to narrow the role/seniority (e.g. a more specific title) or pick " +
          `which ${MAX_CANDIDATES} or fewer to analyze first, then call analyze_company again with that smaller list.`,
        true,
      );
    }

    if (!args.confirm) {
      const unlocked = await Promise.all(candidateUrls.map((u) => isProspectUnlocked(ctx.company_id, u)));
      const newCount = unlocked.filter((u) => !u).length;
      if (newCount === 0) {
        return text(
          `All ${candidateUrls.length} candidates have already been analyzed for your team. ` +
            "Call analyze_company again with the same candidate_urls and confirm:true to see the results.",
        );
      }
      return text(
        `This will analyze ${candidateUrls.length} candidates (${newCount} new). It analyzes one at a time, so this ` +
          "may take a few minutes. Confirm with the user that you're about to do this, then call analyze_company " +
          "again with the same candidate_urls and confirm:true to proceed.",
      );
    }

    const outcomes: { analysis: ProspectAnalysis; charged: boolean }[] = [];
    for (const url of candidateUrls) {
      const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, url);
      if (!alreadyUnlocked) {
        const status = await checkQuota(ctx);
        if (!status.allowed) break; // out of credits - stop gracefully, return what we have
      }
      let analysis: ProspectAnalysis;
      try {
        analysis = await analyzeProspectUrl(url, ctx);
      } catch {
        continue; // skip a bad URL rather than failing the whole batch (and never charged for it)
      }
      if (!alreadyUnlocked) await chargeCredit(ctx, url);
      outcomes.push({ analysis, charged: !alreadyUnlocked });
    }

    if (!outcomes.length) return text("Couldn't analyze any of those candidates. Try again.", true);

    const ranked = outcomes
      .map((o) => ({ ...o, best: o.analysis.results[0] ?? null }))
      .sort((a, b) => (b.best?.strengthScore ?? -1) - (a.best?.strengthScore ?? -1));

    const lines = ranked.map((o, i) => {
      const name = `${o.analysis.enriched.name}${o.analysis.enriched.title ? `, ${o.analysis.enriched.title}` : ""} (${o.analysis.url})`;
      return o.best ? `${i + 1}. ${name} - ${summarizePath(o.best)}` : `${i + 1}. ${name} - no shared connections found.`;
    });

    const top = ranked[0];
    const headline = top?.best
      ? `Your best way into this company is through ${top.analysis.enriched.name} (${top.analysis.url}) - ${summarizePath(top.best)}.`
      : "None of these candidates share a connection with your team yet.";

    // Recent company posts are opt-in only - ask the user, only fetch (call
    // analyze_company again with company_url + include_posts:true) if they
    // say yes. Don't fetch them automatically here.
    return text(
      `${headline}\n\nFull ranking:\n${lines.join("\n")}\n\n` +
        "Ask the user if they'd like this company's recent LinkedIn posts too - only fetch them (call " +
        "analyze_company again with company_url + include_posts:true) if they say yes. " +
        `Defaults to ${DEFAULT_POSTS_COUNT} posts - if they ask for a specific number, pass posts_count too (max ${MAX_POSTS_COUNT}).`,
    );
  },
};
