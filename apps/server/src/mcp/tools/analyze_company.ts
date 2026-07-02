import type { ToolContext, ToolHandler } from "@commonality/shared";
import { checkQuota, incrementUsage, isProspectUnlocked, recordProspectUnlock } from "../../auth/quota.js";
import { searchCompanies, searchProfiles } from "../../services/apify.js";
import { appendFreeTrialTip } from "../freeTrialTips.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath, type ProspectAnalysis } from "./_prospect.js";

interface Args {
  company_url?: string;
  company_name?: string;
  role?: string[];
  role_retry?: boolean;
  candidate_urls?: string[];
  confirm?: boolean;
}

const ROLE_SEARCH_LIMIT = 25;
const MAX_CANDIDATES = 20;

// Account-based "best way into [Company]" - a multi-call flow built on top of
// the same per-prospect pipeline analyze_prospect uses (Cassidy enrich + match):
//   0. company_name, no company_url  -> resolve the name to a LinkedIn company URL
//      (or the user can paste one directly if none of the matches are right).
//   1. company_url, no role          -> ask the user for a role, then search.
//      company_url + role            -> LinkedIn people-search scoped to that
//      company + a few broad keyword terms (e.g. "Sales", "Business
//      Development" - not full titles with seniority like "VP of Sales",
//      which only narrows the match and misses real title wording). Zero
//      results: try one reworded/broader batch of terms (role_retry:true)
//      before asking the user to revise their filters - never silently
//      falls back to an unfiltered roster.
//   2. + candidate_urls              -> preview how many NEW searches analyzing them would cost.
//   3. + candidate_urls + confirm    -> run it, charging quota per new candidate, return a ranking.
// Billing is handled inside run() (per-candidate, dedup'd by URL) rather than
// the single usesQuota/billingKey-per-call path other tools use, since one
// call here can cover anywhere from 0 to MAX_CANDIDATES billable units.
export const analyze_company: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.company_url) {
      if (!args.company_name) return text("Provide the target company's LinkedIn URL or name.", true);

      let companies;
      try {
        companies = await searchCompanies(args.company_name);
      } catch {
        return text("Couldn't look up that company right now. Please try again.", true);
      }
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

    if (!args.candidate_urls || args.candidate_urls.length === 0) {
      if (!args.role || args.role.length === 0) {
        return text(
          "Ask the user what department/function (and, optionally, seniority) they want to reach - e.g. \"sales\", " +
            "\"a senior person in business development\". Turn the department/function part into 1-4 broad keyword " +
            "terms for the role field, not full titles - skip seniority words like \"VP\" or \"Director\" there, " +
            "since that only narrows the match and misses real title wording. If the user gave a seniority, apply " +
            "it yourself afterward by reading the title on each returned candidate - don't put it in the search. " +
            "Then call analyze_company again with company_url + role (the broad keyword terms).",
        );
      }

      const roleLabel = args.role.join(" / ");
      let candidates: { name: string; title: string; linkedinUrl: string }[];
      try {
        candidates = await searchProfiles({ currentCompanies: [args.company_url], currentJobTitles: args.role }, ROLE_SEARCH_LIMIT);
      } catch {
        return text("Couldn't search that company's people right now. Please try again.", true);
      }

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
        `${candidates.length} people matching "${roleLabel}" at this company:\n${lines.join("\n")}\n\n` +
          "If the user specified a seniority (e.g. \"VP\", \"director-level\", \"senior\"), read each person's title " +
          "above and filter/reorder this list yourself to lead with the ones that actually match it, noting that you " +
          "narrowed it down - don't just dump the raw list when they asked for a seniority. Confirm with the user " +
          `which of these to analyze (up to ${MAX_CANDIDATES} at a time), then call analyze_company again with ` +
          "company_url + candidate_urls to preview the cost before analyzing.",
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
          `All ${candidateUrls.length} candidates have already been analyzed for your team - this will be free. ` +
            "Call analyze_company again with the same candidate_urls and confirm:true to see the results.",
        );
      }
      const quota = await checkQuota(ctx);
      if (newCount > quota.remaining) {
        return text(
          `Analyzing all ${candidateUrls.length} candidates needs ${newCount} new searches, but you only have ${quota.remaining} remaining. ` +
            "Pick fewer candidates, or call again with confirm:true to analyze as many as your quota allows.",
        );
      }
      return text(
        `This will analyze ${candidateUrls.length} candidates (${newCount} new - the rest were already analyzed and are free), ` +
          `using ${newCount} of your ${quota.remaining} remaining searches. It analyzes one at a time, so this may take a few minutes. ` +
          "Call analyze_company again with the same candidate_urls and confirm:true to proceed.",
      );
    }

    const outcomes: { analysis: ProspectAnalysis; charged: boolean }[] = [];
    let lastUsedCount: number | null = null;
    for (const url of candidateUrls) {
      const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, url);
      if (!alreadyUnlocked) {
        const status = await checkQuota(ctx);
        if (!status.allowed) break; // out of quota - stop gracefully, return what we have
      }
      let analysis: ProspectAnalysis;
      try {
        analysis = await analyzeProspectUrl(url, ctx);
      } catch {
        continue; // skip a bad URL rather than failing the whole batch
      }
      if (!alreadyUnlocked) {
        await recordProspectUnlock(ctx.company_id, url);
        lastUsedCount = await incrementUsage(ctx.company_id);
      }
      outcomes.push({ analysis, charged: !alreadyUnlocked });
    }

    if (!outcomes.length) return text("Couldn't analyze any of those candidates. Try again.", true);

    const ranked = outcomes
      .map((o) => ({ ...o, best: o.analysis.results[0] ?? null }))
      .sort((a, b) => (b.best?.strengthScore ?? -1) - (a.best?.strengthScore ?? -1));

    const lines = ranked.map((o, i) => {
      const name = `${o.analysis.enriched.name}${o.analysis.enriched.title ? `, ${o.analysis.enriched.title}` : ""}`;
      return o.best ? `${i + 1}. ${name} - ${summarizePath(o.best)}` : `${i + 1}. ${name} - no shared connections found.`;
    });

    const top = ranked[0];
    const headline = top?.best
      ? `Your best way into this company is through ${top.analysis.enriched.name} - ${summarizePath(top.best)}.`
      : "None of these candidates share a connection with your team yet.";

    const charged = outcomes.filter((o) => o.charged).length;
    const finalResult = text(
      `${headline}\n\nFull ranking:\n${lines.join("\n")}\n\nUsed ${charged} search${charged === 1 ? "" : "es"}.`,
    );
    return ctx.plan === "free" && lastUsedCount !== null
      ? appendFreeTrialTip(finalResult, lastUsedCount, ctx.role)
      : finalResult;
  },
};
