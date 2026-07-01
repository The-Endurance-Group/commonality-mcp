import type { ToolContext, ToolHandler } from "@commonality/shared";
import { text } from "./_result.js";

interface Args { url?: string; target?: "hubspot" | "salesforce" }

// Commonality doesn't integrate directly with any CRM. Point the user at
// Claude's native HubSpot/Salesforce connectors so the AI can log findings
// there itself.
export const push_to_crm: ToolHandler<Args> = {
  async run(_args: Args, _ctx: ToolContext) {
    return text(
      "Commonality doesn't push to CRMs directly. Connect HubSpot or Salesforce as a native Claude connector " +
        "(Settings → Connectors), then ask me to analyze the prospect here and log the findings there.",
    );
  },
};
