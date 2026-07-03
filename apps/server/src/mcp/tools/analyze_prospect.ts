import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, checkQuota, isProspectUnlocked, quotaExceededMessage } from "../../auth/quota.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath } from "./_prospect.js";

// Find warm paths from the team to a prospect. Returns a ranked, token-lean
// summary - full enrichment stays in Supabase. 1 credit per (company, URL) -
// this is one Cassidy enrichment call, and re-analysing the same prospect is
// free. Pre-checks quota to skip the vendor call when clearly over limit
// (already-unlocked prospects stay free regardless), but only actually
// charges after the call succeeds - a failed Cassidy call must never cost a
// credit.
export const analyze_prospect: ToolHandler<{ url: string }> = {
  async run(args: { url: string }, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);

    const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, args.url);
    if (!alreadyUnlocked) {
      const status = await checkQuota(ctx);
      if (!status.allowed) return text(quotaExceededMessage(status, ctx.plan, ctx.role), true);
    }

    let enriched, results;
    try {
      ({ enriched, results } = await analyzeProspectUrl(args.url, ctx));
    } catch {
      return text("Couldn't analyze that prospect right now. Please try again.", true);
    }
    await chargeCredit(ctx, args.url);
    const billing = alreadyUnlocked ? "Already analyzed for your team - no credit used." : "Used 1 credit.";

    const header = `${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}\n${args.url}`;
    if (results.length === 0) {
      return text(`${header}\n\nNo warm paths found on your team yet.\n\n${billing}`);
    }

    const top = results.slice(0, 5).map((r, i) => `${i + 1}. ${summarizePath(r)}`).join("\n");
    return text(`${header}\n\nTop warm paths:\n${top}\n\n${billing}`);
  },
};
