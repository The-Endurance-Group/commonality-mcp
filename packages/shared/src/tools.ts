// MCP tool type definitions shared between server and web.
// Keep descriptions short — every word costs tokens on every Claude message.

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  /** Whether invoking this tool consumes a search from the workspace quota. */
  usesQuota?: boolean;
}

/** Authenticated context passed to every tool's run() — derived from the JWT. */
export interface ToolContext {
  company_id: string;
  user_id: string;
  role: "admin" | "member";
  plan: "free" | "pro";
  email: string;
}

/** MCP content block returned by a tool. We only ever return text blocks. */
export interface McpTextContent {
  type: "text";
  text: string;
}

export interface McpToolResult {
  content: McpTextContent[];
  isError?: boolean;
}

export interface ToolHandler<Args = Record<string, unknown>> {
  usesQuota?: boolean;
  /**
   * For quota tools, an optional per-call billing key (e.g. a prospect URL).
   * When the same (company, key) has already been charged, the call is free.
   * Return null to always charge (e.g. open-ended searches).
   */
  billingKey?(args: Args): string | null;
  run(args: Args, ctx: ToolContext): Promise<McpToolResult>;
}

/** Names of the 13 MCP tools Commonality exposes. */
export const TOOL_NAMES = [
  "analyze_prospect",
  "analyze_company",
  "add_employee",
  "search_prospects",
  "generate_outreach",
  "call_prep",
  "prospect_of_day",
  "push_to_crm",
  "send_to_teammate",
  "upload_connections",
  "social_capital_dashboard",
  "invite_member",
  "get_usage",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
