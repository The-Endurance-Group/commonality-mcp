import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { Router, type Router as RouterType } from "express";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { ctxFromReq, handleToolCall, SERVER_INSTRUCTIONS } from "../mcp/server.js";
import { TOOL_DEFS } from "../mcp/registry.js";
import { incrementChatUsage } from "../services/chatUsage.js";

// In-app chat (Dashboard "Try it here" panel) - lets a team use Commonality
// without connecting an MCP client first. Billed to Commonality's own
// Anthropic account, not the customer's - the daily message cap below is the
// cost/abuse guardrail, not the credit system (tool calls this triggers
// still cost credits normally, via the same handleToolCall() used by MCP).
export const chatRouter: RouterType = Router();

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey });
  return client;
}

// Same tool defs the MCP connector advertises via tools/list - one registry,
// two surfaces. Anthropic's SDK calls the field input_schema, not inputSchema.
const ANTHROPIC_TOOLS = TOOL_DEFS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
}));

const MAX_TOOL_ITERATIONS = 6;
const MAX_TOKENS = 2048;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Newline-delimited JSON events, one per line, so the client can render the
// reply as it's generated (matching the "typing" feel of Claude.ai) instead
// of waiting for the whole response and popping it in at once.
type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "tool_start" }
  | { type: "done" }
  | { type: "error"; message: string };

function writeEvent(res: import("express").Response, event: ChatEvent) {
  res.write(`${JSON.stringify(event)}\n`);
}

chatRouter.post("/", async (req, res) => {
  const user = req.user!;
  const { messages } = (req.body ?? {}) as { messages?: ChatMessage[] };
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: "messages[] required" });
    return;
  }

  try {
    await incrementChatUsage(user.company_id);
  } catch (err) {
    logger.error({ err }, "chat usage tracking failed");
    // Non-fatal - this is only for the superadmin usage dashboard, not a gate.
  }

  const ctx = ctxFromReq(user);
  const conversation: MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });

  // A user hitting "Stop" aborts the fetch client-side, which closes this
  // connection - stop mid-loop instead of continuing to burn Anthropic/tool
  // calls (and writing to a socket that's gone) for a reply nobody will see.
  let clientGone = false;
  req.on("close", () => {
    clientGone = true;
  });

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS && !clientGone; i++) {
      const stream = getClient().messages.stream({
        model: config.anthropicModel,
        max_tokens: MAX_TOKENS,
        system: SERVER_INSTRUCTIONS,
        tools: ANTHROPIC_TOOLS,
        messages: conversation,
      });
      stream.on("text", (delta) => {
        if (!clientGone) writeEvent(res, { type: "delta", text: delta });
      });
      const response = await stream.finalMessage();
      if (clientGone) return;
      conversation.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) {
        writeEvent(res, { type: "done" });
        res.end();
        return;
      }

      writeEvent(res, { type: "tool_start" });
      const toolResults = [];
      for (const tu of toolUses) {
        const result = await handleToolCall(ctx, tu.name, (tu.input as Record<string, unknown>) ?? {});
        toolResults.push({
          type: "tool_result" as const,
          tool_use_id: tu.id,
          content: result.content.map((c) => c.text).join("\n"),
          is_error: result.isError,
        });
      }
      conversation.push({ role: "user", content: toolResults });
    }
    if (!clientGone) {
      writeEvent(res, { type: "error", message: "Took too many steps to find an answer. Try rephrasing." });
      res.end();
    }
  } catch (err) {
    if (clientGone) return;
    logger.error({ err }, "chat completion failed");
    writeEvent(res, { type: "error", message: "Something went wrong. Please try again." });
    res.end();
  }
});
