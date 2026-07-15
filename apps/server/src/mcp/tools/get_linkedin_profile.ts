import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, checkQuota, isProspectUnlocked, quotaExceededMessage } from "../../auth/quota.js";
import { getEnrichedProfile } from "../../services/enrichmentCache.js";
import { summarizeBackground } from "./_prospect.js";
import { text } from "./_result.js";

interface Args {
  url: string;
}

// Standalone version of the enrichment step analyze_prospect already does
// internally - useful when the user just wants a person's LinkedIn
// background without running the team warm-path match. Same 1-credit-per-
// (company, URL) billing and cache as analyze_prospect - re-fetching an
// already-unlocked URL (via either tool) is free.
export const get_linkedin_profile: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.url) return text("Please provide the LinkedIn profile URL.", true);

    const alreadyUnlocked = await isProspectUnlocked(ctx.company_id, args.url);
    if (!alreadyUnlocked) {
      const status = await checkQuota(ctx);
      if (!status.allowed) return text(quotaExceededMessage(status, ctx.plan, ctx.role), true);
    }

    let enriched;
    try {
      enriched = await getEnrichedProfile(args.url);
    } catch {
      return text("Couldn't get that profile right now. Please try again.", true);
    }
    await chargeCredit(ctx, "get_linkedin_profile", { dedupeKey: args.url, target: args.url });

    const header = `${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}\n${args.url}`;
    return text(`${header}${summarizeBackground(enriched)}`);
  },
};
