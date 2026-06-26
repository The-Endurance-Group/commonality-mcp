import type { Company, ToolContext, ToolHandler } from "@commonality/shared";
import { generateCombinedOutreach } from "../../services/analysis.js";
import { getCompany } from "../../db/queries.js";
import { text } from "./_result.js";
import { analyzeProspectUrl } from "./_prospect.js";

interface Args { url: string; employee_name?: string }

// Draft a LinkedIn message, email, and a hand-off note for a warm path.
export const generate_outreach: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);

    const [{ enriched, results }, companyRec] = await Promise.all([
      analyzeProspectUrl(args.url, ctx),
      getCompany(ctx.company_id),
    ]);
    if (!companyRec) return text("Workspace not found.", true);
    if (!results.length) return text(`No warm path to ${enriched.name} — outreach works best through a shared connection.`);

    const chosen = args.employee_name
      ? results.find((r) => r.employee.name.toLowerCase() === args.employee_name!.toLowerCase()) ?? results[0]
      : results[0];

    const company: Company = { id: companyRec.id, name: companyRec.name, context: companyRec.context, website: companyRec.website };
    const out = await generateCombinedOutreach(company, {
      prospectName: enriched.name,
      prospectTitle: enriched.title || undefined,
      prospectCompany: enriched.company || undefined,
      employeeName: chosen.employee.name,
      employeeTitle: chosen.employee.title || undefined,
      commonalities: chosen.commonalities,
    });

    return text(
      `Outreach via ${chosen.employee.name} → ${enriched.name}\n\n— LinkedIn —\n${out.linkedin}\n\n— Email —\n${out.email}\n\n— Note for ${chosen.employee.name} —\n${out.note}`,
    );
  },
};
