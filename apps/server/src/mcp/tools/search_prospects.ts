import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, checkQuota, quotaExceededMessage } from "../../auth/quota.js";
import { searchProfiles, type ProfileSearchFilters } from "../../services/apify.js";
import { text } from "./_result.js";

interface SearchArgs {
  query?: string;
  titles?: string[];
  locations?: string[];
  companies?: string[];
  schools?: string[];
  limit?: number;
}

// LinkedIn people search via Apify. Returns a lean list of matches. 1 credit
// per call - this is one Apify actor invocation. Pre-checks quota to skip the
// vendor call entirely when clearly over limit, but only actually charges
// after the call succeeds - a failed Apify call must never cost a credit.
export const search_prospects: ToolHandler<SearchArgs> = {
  async run(args: SearchArgs, ctx: ToolContext) {
    const status = await checkQuota(ctx);
    if (!status.allowed) return text(quotaExceededMessage(status, ctx.plan, ctx.role), true);

    const filters: ProfileSearchFilters = {
      searchQuery: args.query,
      currentJobTitles: args.titles,
      locations: args.locations,
      currentCompanies: args.companies,
      schools: args.schools,
    };
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);

    let profiles;
    try {
      profiles = await searchProfiles(filters, limit);
    } catch {
      return text("Search failed. Try again.", true);
    }
    const targetBits = [args.query, args.titles?.join("/"), args.companies?.join("/")].filter(Boolean);
    await chargeCredit(ctx, "search_prospects", { target: targetBits.join(" - ") || undefined });
    if (!profiles.length) return text("No prospects matched those filters.");

    const lines = profiles.map(
      (p, i) => `${i + 1}. ${p.name}${p.title ? ` - ${p.title}` : ""}${p.company ? ` @ ${p.company}` : ""}\n   ${p.linkedinUrl}`,
    );
    return text(`Found ${profiles.length} prospects:\n${lines.join("\n")}\n\nAnalyze any of them with analyze_prospect.`);
  },
};
