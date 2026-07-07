import type { McpToolDef, ToolHandler, ToolName } from "@commonality/shared";
import { analyze_prospect } from "./tools/analyze_prospect.js";
import { analyze_company } from "./tools/analyze_company.js";
import { add_employee } from "./tools/add_employee.js";
import { search_prospects } from "./tools/search_prospects.js";
import { upload_connections } from "./tools/upload_connections.js";
import { social_capital_dashboard } from "./tools/social_capital_dashboard.js";
import { invite_member } from "./tools/invite_member.js";
import { get_usage } from "./tools/get_usage.js";

// Tool dispatch table. Handlers run the logic; defs are what tools/list returns.
export const HANDLERS: Record<ToolName, ToolHandler<any>> = {
  analyze_prospect,
  analyze_company,
  add_employee,
  search_prospects,
  upload_connections,
  social_capital_dashboard,
  invite_member,
  get_usage,
};

// Descriptions stay SHORT - every word costs tokens on every Claude message.
export const TOOL_DEFS: McpToolDef[] = [
  {
    name: "analyze_prospect",
    description:
      "Find warm paths to a prospect. Returns ranked connections from your team. Call this " +
      "immediately whenever the user pastes or shares a LinkedIn profile URL (linkedin.com/in/...) " +
      "- even if that's the entire message with no other text - do not ask for confirmation first.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Prospect LinkedIn URL - if the user's message is just a bare linkedin.com/in/... URL, that IS the url" },
        include_posts: { type: "boolean", description: "Set true only after the user says yes to seeing this person's recent posts" },
        posts_count: { type: "number", description: "How many recent posts to fetch (default 3, max 10) - only used with include_posts" },
      },
      required: ["url"],
    },
  },
  {
    name: "analyze_company",
    description:
      "Find the best way into a company (account-based, not one person). Call immediately whenever the user " +
      "pastes or shares a LinkedIn company URL (linkedin.com/company/...) - even if that's the entire message - " +
      "with that as company_url, no confirmation needed first. Otherwise call with company_name to resolve a URL, " +
      "or company_url + role to search their people by title (runs immediately, no confirmation round - re-call " +
      "with corrected role terms if the results are wrong); pick candidates, call again with candidate_urls to " +
      "preview scope, then confirm:true to run the analysis.",
    inputSchema: {
      type: "object",
      properties: {
        company_name: { type: "string", description: "Target company's name - use this to resolve the real LinkedIn URL. Prefer this over guessing company_url yourself." },
        company_url: { type: "string", description: "Target company's LinkedIn URL, from a prior company_name lookup - never guess this" },
        role: {
          type: "array",
          items: { type: "string" },
          description:
            "1-4 broad keyword terms, one per department/function the user named - e.g. if they said \"sales or marketing\", " +
            "send [\"Sales\", \"Marketing\"], not just one of them. LinkedIn matches these against the full title, so a bare " +
            "keyword catches every seniority (VP, Director, Associate, etc). " +
            "Don't add seniority or full title phrases (e.g. \"VP of Sales\") - that narrows the match and misses real title " +
            "wording. Matched with OR across terms; the user picks seniority from the returned candidate list instead.",
        },
        role_retry: { type: "boolean", description: "Set true when retrying role with a broader/different set of title variants after zero results" },
        candidate_urls: { type: "array", items: { type: "string" }, description: "LinkedIn URLs of employees you selected" },
        confirm: { type: "boolean", description: "Set true to run the analysis" },
        include_posts: { type: "boolean", description: "Set true only after the user says yes to seeing this company's recent posts - works with just company_url" },
        posts_count: { type: "number", description: "How many recent posts to fetch (default 3, max 10) - only used with include_posts" },
      },
    },
  },
  {
    name: "add_employee",
    description: "Admin only. Add one person to your team roster by their LinkedIn profile URL, so their connections/background count toward warm paths.",
    inputSchema: {
      type: "object",
      properties: {
        linkedin_url: { type: "string", description: "The person's LinkedIn profile URL" },
        name: { type: "string", description: "Their name, if known" },
      },
      required: ["linkedin_url"],
    },
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
  },
  {
    name: "upload_connections",
    description: "Add a few 1st-degree LinkedIn connections manually. For a full CSV export, tell the user to upload it in the web app onboarding instead - pasting a whole export here wastes tokens.",
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
    description: "Show your current credit usage and plan.",
    inputSchema: { type: "object", properties: {} },
  },
];
