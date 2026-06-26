import type { McpToolResult } from "@commonality/shared";

/** Wrap plain text as an MCP tool result. */
export function text(s: string, isError = false): McpToolResult {
  return { content: [{ type: "text", text: s }], isError };
}
