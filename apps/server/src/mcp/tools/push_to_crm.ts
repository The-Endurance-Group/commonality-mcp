import type { ToolContext, ToolHandler } from "@commonality/shared";
import { getCompany } from "../../db/queries.js";
import { pushToHubspot } from "../../services/hubspot.js";
import { pushToSalesforce } from "../../services/salesforce.js";
import { text } from "./_result.js";
import { analyzeProspectUrl } from "./_prospect.js";

interface Args { url: string; target?: "hubspot" | "salesforce" }

// Push a prospect (with the warm-path findings) to the workspace's configured CRM.
export const push_to_crm: ToolHandler<Args> = {
  async run(args: Args, ctx: ToolContext) {
    if (!args.url) return text("Please provide the prospect's LinkedIn URL.", true);
    const company = await getCompany(ctx.company_id);
    if (!company) return text("Workspace not found.", true);

    const hasHubspot = !!company.hubspot_api_key;
    const hasSalesforce = !!(company.salesforce_instance_url && company.salesforce_client_id && company.salesforce_client_secret);
    const target = args.target ?? (hasHubspot ? "hubspot" : hasSalesforce ? "salesforce" : undefined);
    if (!target) return text("No CRM is connected. Add HubSpot or Salesforce credentials in your dashboard → Integrations.", true);

    const { enriched, results } = await analyzeProspectUrl(args.url, ctx);
    const top = results[0];
    const prospect = {
      name: enriched.name,
      email: enriched.email,
      title: enriched.title || undefined,
      company: enriched.company || undefined,
      linkedinUrl: args.url,
    };
    const pushOpts = {
      prospect,
      employeeName: top?.employee.name ?? "your team",
      commonalities: top?.commonalities ?? [],
      strengthScore: top?.strengthScore ?? 0,
    };

    try {
      if (target === "hubspot") {
        if (!hasHubspot) return text("HubSpot isn't connected for this workspace.", true);
        const r = await pushToHubspot(company.hubspot_api_key!, pushOpts);
        return text(`${r.created ? "Created" : "Updated"} ${enriched.name} in HubSpot (contact ${r.contactId}) with Commonality findings.`);
      }
      if (!hasSalesforce) return text("Salesforce isn't connected for this workspace.", true);
      const r = await pushToSalesforce(
        company.salesforce_instance_url!,
        company.salesforce_client_id!,
        company.salesforce_client_secret!,
        pushOpts,
      );
      return text(`${r.created ? "Created" : "Updated"} ${enriched.name} in Salesforce (lead ${r.leadId}) with Commonality findings.`);
    } catch (err) {
      return text(`CRM push failed: ${err instanceof Error ? err.message : "unknown error"}.`, true);
    }
  },
};
