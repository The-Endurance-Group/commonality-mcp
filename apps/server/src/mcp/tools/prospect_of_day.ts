import type { ToolContext, ToolHandler } from "@commonality/shared";
import { chargeCredit, quotaExceededMessage } from "../../auth/quota.js";
import { searchProfiles, type ProfileSearchFilters } from "../../services/apify.js";
import { getCompany } from "../../db/queries.js";
import { text } from "./_result.js";
import { analyzeProspectUrl, summarizePath } from "./_prospect.js";

// Surface one fresh prospect for today that the team has a warm path to.
// Uses the workspace ICP (or company context) to search, then checks the first
// few candidates for a warm path. Capped to limit enrichment cost. 1 credit for
// the search itself, plus 1 credit per candidate actually enriched (up to
// MAX_ENRICH) - stops early if credits run out mid-scan.
const MAX_ENRICH = 3;

export const prospect_of_day: ToolHandler<Record<string, never>> = {
  async run(_args, ctx: ToolContext) {
    const searchCharge = await chargeCredit(ctx);
    if (!searchCharge.allowed) return text(quotaExceededMessage(searchCharge, ctx.plan, ctx.role), true);

    const company = await getCompany(ctx.company_id);
    if (!company) return text("Workspace not found.", true);

    const icp = company.icp_profile;
    const filters: ProfileSearchFilters =
      icp && typeof icp === "object"
        ? (icp as ProfileSearchFilters)
        : { searchQuery: (company.context ?? company.name).slice(0, 80) };

    let candidates;
    try {
      candidates = await searchProfiles(filters, 10);
    } catch {
      return text("Couldn't fetch today's prospect right now. Please try again.", true);
    }
    if (!candidates.length) return text("No prospects matched your ICP today. Refine your ICP in the dashboard.");

    let stoppedForCredits = false;
    for (const cand of candidates.slice(0, MAX_ENRICH)) {
      const charge = await chargeCredit(ctx, cand.linkedinUrl);
      if (!charge.allowed) {
        stoppedForCredits = true;
        break;
      }
      const { enriched, results } = await analyzeProspectUrl(cand.linkedinUrl, ctx);
      if (results.length) {
        return text(
          `Prospect of the day: ${enriched.name}${enriched.title ? `, ${enriched.title}` : ""}${enriched.company ? ` at ${enriched.company}` : ""}\n${cand.linkedinUrl}\n\nWarm path:\n${summarizePath(results[0])}`,
        );
      }
    }

    const top = candidates[0];
    const creditNote = stoppedForCredits ? "\n\n(Stopped early - out of credits for this cycle.)" : "";
    return text(
      `Prospect of the day: ${top.name}${top.title ? `, ${top.title}` : ""}${top.company ? ` at ${top.company}` : ""}\n${top.linkedinUrl}\n\nNo warm path on your team yet - a cold but on-ICP option.${creditNote}`,
    );
  },
};
