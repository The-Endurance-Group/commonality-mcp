import type { ToolContext, ToolHandler } from "@commonality/shared";
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

// LinkedIn people search via Apify. Returns a lean list of matches.
export const search_prospects: ToolHandler<SearchArgs> = {
  usesQuota: true,
  async run(args: SearchArgs, _ctx: ToolContext) {
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
    if (!profiles.length) return text("No prospects matched those filters.");

    const lines = profiles.map(
      (p, i) => `${i + 1}. ${p.name}${p.title ? ` — ${p.title}` : ""}${p.company ? ` @ ${p.company}` : ""}\n   ${p.linkedinUrl}`,
    );
    return text(`Found ${profiles.length} prospects:\n${lines.join("\n")}\n\nAnalyze any of them with analyze_prospect.`);
  },
};
