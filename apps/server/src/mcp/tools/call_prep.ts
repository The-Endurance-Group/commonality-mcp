import type { Company, ToolContext, ToolHandler } from "@commonality/shared";
import { describeCommonalities, generateCallPrep } from "../../services/analysis.js";
import { getCompany } from "../../db/queries.js";
import { text } from "./_result.js";
import { analyzeProspectUrl } from "./_prospect.js";

interface Args { url: string }

// Coach the user through a call with a prospect, using the team's shared
// commonalities as the opener.
export const call_prep: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);

    const [{ enriched, prospect, results }, companyRec] = await Promise.all([
      analyzeProspectUrl(args.url, ctx),
      getCompany(ctx.company_id),
    ]);
    if (!companyRec) return text("Workspace not found.", true);

    const top = results[0];
    const commonalityStr = top
      ? describeCommonalities(top.commonalities)
      : "you both value building genuine relationships";

    const company: Company = { id: companyRec.id, name: companyRec.name, context: companyRec.context, website: companyRec.website };
    const prep = await generateCallPrep(company, {
      prospect: {
        name: enriched.name,
        title: prospect.title,
        company: prospect.company,
        almaMater: prospect.almaMater,
        graduationYear: prospect.graduationYear,
        pastCompanies: prospect.pastCompanies,
        currentLocation: prospect.currentLocation,
        bio: prospect.bio,
      },
      commonality: commonalityStr,
      commonalities: top?.commonalities,
    });

    return text(
      `Call prep - ${enriched.name} (${args.url})\n\n1. OPENING\n${prep.opening}\n\n2. DISCOVERY\n${prep.discovery}\n\n3. TRANSITION\n${prep.transition}\n\n4. OBJECTIONS\n${prep.objections}\n\n5. FOLLOW-UP\n${prep.followUp}`,
    );
  },
};
