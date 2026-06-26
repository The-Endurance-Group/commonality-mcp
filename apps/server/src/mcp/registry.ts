import type { McpToolDef, ToolHandler, ToolName } from "@commonality/shared";
import { analyze_prospect } from "./tools/analyze_prospect.js";
import { search_prospects } from "./tools/search_prospects.js";
import { generate_outreach } from "./tools/generate_outreach.js";
import { call_prep } from "./tools/call_prep.js";
import { prospect_of_day } from "./tools/prospect_of_day.js";
import { push_to_crm } from "./tools/push_to_crm.js";
import { send_to_teammate } from "./tools/send_to_teammate.js";
import { upload_connections } from "./tools/upload_connections.js";
import { social_capital_dashboard } from "./tools/social_capital_dashboard.js";
import { invite_member } from "./tools/invite_member.js";
import { get_usage } from "./tools/get_usage.js";

// Tool dispatch table. Handlers run the logic; defs are what tools/list returns.
export const HANDLERS: Record<ToolName, ToolHandler<any>> = {
  analyze_prospect,
  search_prospects,
  generate_outreach,
  call_prep,
  prospect_of_day,
  push_to_crm,
  send_to_teammate,
  upload_connections,
  social_capital_dashboard,
  invite_member,
  get_usage,
};

// Descriptions stay SHORT — every word costs tokens on every Claude message.
export const TOOL_DEFS: McpToolDef[] = [
  {
    name: "analyze_prospect",
    description: "Find warm paths to a prospect. Returns ranked connections from your team.",
    inputSchema: { type: "object", properties: { url: { type: "string", description: "Prospect LinkedIn URL" } }, required: ["url"] },
    usesQuota: true,
  },
  {
    name: "search_prospects",
    description: "Search LinkedIn for prospects by title, location, company, or school.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        titles: { type: "array", items: { type: "string" } },
        locations: { type: "array", items: { type: "string" } },
        companies: { type: "array", items: { type: "string" } },
        schools: { type: "array", items: { type: "string" } },
        limit: { type: "number" },
      },
    },
    usesQuota: true,
  },
  {
    name: "generate_outreach",
    description: "Draft a LinkedIn message, email, and intro note for a warm path.",
    inputSchema: { type: "object", properties: { url: { type: "string" }, employee_name: { type: "string" } }, required: ["url"] },
  },
  {
    name: "call_prep",
    description: "Get a 5-part call script for a prospect, opening with your shared commonality.",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  },
  {
    name: "prospect_of_day",
    description: "Get one fresh on-ICP prospect your team has a warm path to.",
    inputSchema: { type: "object", properties: {} },
    usesQuota: true,
  },
  {
    name: "push_to_crm",
    description: "Push a prospect and the warm-path findings to HubSpot or Salesforce.",
    inputSchema: { type: "object", properties: { url: { type: "string" }, target: { type: "string", enum: ["hubspot", "salesforce"] } }, required: ["url"] },
  },
  {
    name: "send_to_teammate",
    description: "Hand a prospect to a teammate with a stronger connection.",
    inputSchema: { type: "object", properties: { teammate_email: { type: "string" }, url: { type: "string" }, note: { type: "string" } }, required: ["teammate_email", "url"] },
  },
  {
    name: "upload_connections",
    description: "Add a team member's 1st-degree LinkedIn connections for stronger matches.",
    inputSchema: {
      type: "object",
      properties: {
        employee_id: { type: "string" },
        employee_url: { type: "string" },
        connections: { type: "array", items: { type: "object", properties: { name: { type: "string" }, url: { type: "string" }, connected_on: { type: "string" } } } },
      },
      required: ["connections"],
    },
  },
  {
    name: "social_capital_dashboard",
    description: "Snapshot of your team's collective network: top schools, employers, locations.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "invite_member",
    description: "Invite a teammate to your Commonality workspace (admin only).",
    inputSchema: { type: "object", properties: { email: { type: "string" } }, required: ["email"] },
  },
  {
    name: "get_usage",
    description: "Show your current search usage and plan.",
    inputSchema: { type: "object", properties: {} },
  },
];
