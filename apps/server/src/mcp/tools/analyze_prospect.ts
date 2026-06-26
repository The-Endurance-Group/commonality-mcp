import type { ToolContext, ToolHandler } from "@commonality/shared";
import { checkQuota } from "../../auth/quota.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath } from "./_prospect.js";

// Find warm paths from the team to a prospect. Returns a ranked, token-lean
// summary — full enrichment stays in Supabase.
export const analyze_prospect: ToolHandler<{ url: string }> = {
  usesQuota: true,
  async run(args: { url: string }, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);

    const { enriched, results } = await analyzeProspectUrl(args.url, ctx);
    const quota = await checkQuota(ctx);

    const header = `${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}.`;
    if (results.length === 0) {
      return text(`${header}\n\nNo warm paths found on your team yet. ${quota.remaining} searches remaining.`);
    }

    const top = results.slice(0, 5).map((r, i) => `${i + 1}. ${summarizePath(r)}`).join("\n");
    return text(
      `${header}\n\nTop warm paths:\n${top}\n\n${quota.remaining} searches remaining this month.`,
    );
  },
};
