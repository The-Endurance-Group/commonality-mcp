import type { ToolContext, ToolHandler } from "@commonality/shared";
import { checkQuota, incrementUsage, isProspectUnlocked, recordProspectUnlock } from "../../auth/quota.js";
import {
  getCompanyEmployees as scrapeCompanyRoster,
  searchCompanies,
  searchProfiles,
} from "../../services/apify.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath, type ProspectAnalysis } from "./_prospect.js";

interface Args {
  company_url?: string;
  company_name?: string;
  role?: string;
  candidate_urls?: string[];
  confirm?: boolean;
}

const ROSTER_LIMIT = 40;
const ROLE_SEARCH_LIMIT = 25;
const MAX_CANDIDATES = 20;

// Account-based "best way into [Company]" — a multi-call flow built on top of
// the same per-prospect pipeline analyze_prospect uses (Cassidy enrich + match):
//   0. company_name, no company_url  -> resolve the name to a LinkedIn company URL.
//   1. company_url (+ optional role) -> role given: LinkedIn people-search scoped to
//      that company + title (precise). No role: fall back to a general roster
//      scrape. Either way, return candidates for the AI to pick from.
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
      } catch (err) {
        return text(`Couldn't look up that company: ${err instanceof Error ? err.message : "unknown error"}.`, true);
      }
      if (!companies.length) return text(`No company found matching "${args.company_name}".`, true);

      const lines = companies.map((c, i) => `${i + 1}. ${c.name}${c.location ? ` — ${c.location}` : ""}\n   ${c.linkedinUrl}`);
      return text(
        `Found ${companies.length} companies matching "${args.company_name}":\n${lines.join("\n")}\n\n` +
          "Confirm the right one with the user, then call analyze_company again with company_url set to it.",
      );
    }

    if (!args.candidate_urls || args.candidate_urls.length === 0) {
      if (!args.role) {
        return text(
          "Ask the user what role or seniority they want to reach (e.g. \"VP of Sales\", \"Director of Finance\"), " +
            "then call analyze_company again with company_url + role to search for matching people at that company.",
        );
      }

      let candidates: { name: string; title: string; linkedinUrl: string }[];
      try {
        candidates = await searchProfiles({ currentCompanies: [args.company_url], currentJobTitles: [args.role] }, ROLE_SEARCH_LIMIT);
      } catch (err) {
        return text(`Couldn't search that company's people: ${err instanceof Error ? err.message : "unknown error"}.`, true);
      }

      if (!candidates.length) {
        // Fall back to a general roster pull so the AI still has something to work with.
        let roster;
        try {
          roster = await scrapeCompanyRoster(args.company_url, ROSTER_LIMIT);
        } catch (err) {
          return text(`Couldn't load that company's employees either: ${err instanceof Error ? err.message : "unknown error"}.`, true);
        }
        if (!roster.length) return text("No employees found for that company URL.", true);
        const lines = roster.map((e, i) => `${i + 1}. ${e.name}${e.title ? ` — ${e.title}` : ""}\n   ${e.linkedinUrl}`);
        return text(
          `No exact matches for "${args.role}" — here's the general roster instead (${roster.length} people):\n${lines.join("\n")}\n\n` +
            `Pick likely matches yourself (up to ${MAX_CANDIDATES} at a time), then call analyze_company again with ` +
            "company_url + candidate_urls to preview the cost before analyzing.",
        );
      }

      const lines = candidates.map((c, i) => `${i + 1}. ${c.name} — ${c.title}\n   ${c.linkedinUrl}`);
      return text(
        `${candidates.length} people matching "${args.role}" at this company:\n${lines.join("\n")}\n\n` +
          `Confirm with the user which of these to analyze (up to ${MAX_CANDIDATES} at a time), then call ` +
          "analyze_company again with company_url + candidate_urls to preview the cost before analyzing.",
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
          `All ${candidateUrls.length} candidates have already been analyzed for your team — this will be free. ` +
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
        `This will analyze ${candidateUrls.length} candidates (${newCount} new — the rest were already analyzed and are free), ` +
          `using ${newCount} of your ${quota.remaining} remaining searches. It analyzes one at a time, so this may take a few minutes. ` +
          "Call analyze_company again with the same candidate_urls and confirm:true to proceed.",
      );
    }

    const outcomes: { analysis: ProspectAnalysis; charged: boolean }[] = [];
    for (const url of candidateUrls) {
      const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, url);
      if (!alreadyUnlocked) {
        const status = await checkQuota(ctx);
        if (!status.allowed) break; // out of quota — stop gracefully, return what we have
      }
      let analysis: ProspectAnalysis;
      try {
        analysis = await analyzeProspectUrl(url, ctx);
      } catch {
        continue; // skip a bad URL rather than failing the whole batch
      }
      if (!alreadyUnlocked) {
        await recordProspectUnlock(ctx.company_id, url);
        await incrementUsage(ctx.company_id);
      }
      outcomes.push({ analysis, charged: !alreadyUnlocked });
    }

    if (!outcomes.length) return text("Couldn't analyze any of those candidates. Try again.", true);

    const ranked = outcomes
      .map((o) => ({ ...o, best: o.analysis.results[0] ?? null }))
      .sort((a, b) => (b.best?.strengthScore ?? -1) - (a.best?.strengthScore ?? -1));

    const lines = ranked.map((o, i) => {
      const name = `${o.analysis.enriched.name}${o.analysis.enriched.title ? `, ${o.analysis.enriched.title}` : ""}`;
      return o.best ? `${i + 1}. ${name} — ${summarizePath(o.best)}` : `${i + 1}. ${name} — no shared connections found.`;
    });

    const top = ranked[0];
    const headline = top?.best
      ? `Your best way into this company is through ${top.analysis.enriched.name} — ${summarizePath(top.best)}.`
      : "None of these candidates share a connection with your team yet.";

    const charged = outcomes.filter((o) => o.charged).length;
    return text(
      `${headline}\n\nFull ranking:\n${lines.join("\n")}\n\nUsed ${charged} search${charged === 1 ? "" : "es"}.`,
    );
  },
};
