import type { ToolContext, ToolHandler } from "@commonality/shared";
import { checkQuota, incrementUsage, isProspectUnlocked, recordProspectUnlock } from "../../auth/quota.js";
import { getCompanyEmployees as scrapeCompanyRoster } from "../../services/apify.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath, type ProspectAnalysis } from "./_prospect.js";

interface Args {
  company_url?: string;
  candidate_urls?: string[];
  confirm?: boolean;
}

const ROSTER_LIMIT = 40;
const MAX_CANDIDATES = 20;

// Account-based "best way into [Company]" — a 3-call flow built on top of the
// same per-prospect pipeline analyze_prospect uses (Cassidy enrich + match):
//   1. company_url only            -> scrape + return the roster for the AI to filter by role.
//   2. + candidate_urls            -> preview how many NEW searches analyzing them would cost.
//   3. + candidate_urls + confirm  -> run it, charging quota per new candidate, return a ranking.
// Billing is handled inside run() (per-candidate, dedup'd by URL) rather than
// the single usesQuota/billingKey-per-call path other tools use, since one
// call here can cover anywhere from 0 to MAX_CANDIDATES billable units.
export const analyze_company: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.company_url) return text("Provide the target company's LinkedIn URL.", true);

    if (!args.candidate_urls || args.candidate_urls.length === 0) {
      let roster;
      try {
        roster = await scrapeCompanyRoster(args.company_url, ROSTER_LIMIT);
      } catch (err) {
        return text(`Couldn't load that company's employees: ${err instanceof Error ? err.message : "unknown error"}.`, true);
      }
      if (!roster.length) return text("No employees found for that company URL.", true);

      const lines = roster.map((e, i) => `${i + 1}. ${e.name}${e.title ? ` — ${e.title}` : ""}\n   ${e.linkedinUrl}`);
      return text(
        `${roster.length} people at this company:\n${lines.join("\n")}\n\n` +
          "Ask the user what role or seniority they want to reach (e.g. \"VP of Sales\", \"Director of Finance\"), " +
          "pick the matching candidates from this list yourself, then call analyze_company again with " +
          "company_url + candidate_urls (their LinkedIn URLs) to preview the cost before analyzing.",
      );
    }

    const candidateUrls = args.candidate_urls.slice(0, MAX_CANDIDATES);

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
          `using ${newCount} of your ${quota.remaining} remaining searches. ` +
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
