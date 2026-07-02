import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, isProspectUnlocked, quotaExceededMessage } from "../../auth/quota.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath } from "./_prospect.js";

// Find warm paths from the team to a prospect. Returns a ranked, token-lean
// summary - full enrichment stays in Supabase. 1 credit per (company, URL) -
// this is one Cassidy enrichment call, and re-analysing the same prospect is
// free.
export const analyze_prospect: ToolHandler<{ url: string }> = {
  async run(args: { url: string }, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);

    const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, args.url);
    const charge = await chargeCredit(ctx, args.url);
    if (!charge.allowed) return text(quotaExceededMessage(charge, ctx.plan, ctx.role), true);

    const { enriched, results } = await analyzeProspectUrl(args.url, ctx);
    const billing = alreadyUnlocked ? "Already analyzed for your team - no credit used." : "Used 1 credit.";

    const header = `${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}\n${args.url}`;
    if (results.length === 0) {
      return text(`${header}\n\nNo warm paths found on your team yet.\n\n${billing}`);
    }

    const top = results.slice(0, 5).map((r, i) => `${i + 1}. ${summarizePath(r)}`).join("\n");
    return text(`${header}\n\nTop warm paths:\n${top}\n\n${billing}`);
  },
};
