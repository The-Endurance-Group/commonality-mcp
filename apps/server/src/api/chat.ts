import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { Router, type Router as RouterType } from "express";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { ctxFromReq, handleToolCall, SERVER_INSTRUCTIONS } from "../mcp/server.js";
import { TOOL_DEFS } from "../mcp/registry.js";
import { checkAndIncrementChatUsage } from "../services/chatUsage.js";

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

chatRouter.post("/", async (req, res) => {
  const user = req.user!;
  const { messages } = (req.body ?? {}) as { messages?: ChatMessage[] };
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: "messages[] required" });
    return;
  }

  let usage;
  try {
    usage = await checkAndIncrementChatUsage(user.company_id, config.chatDailyMessageLimit);
  } catch (err) {
    logger.error({ err }, "chat usage check failed");
    res.status(500).json({ error: "chat_unavailable" });
    return;
  }
  if (!usage.allowed) {
    res.status(429).json({
      error: "daily_limit_reached",
      message:
        `This workspace has hit its ${usage.limit}-message daily limit for the in-app chat. ` +
        "Try again tomorrow, or connect Commonality to your own AI (see the Dashboard) for unlimited use.",
    });
    return;
  }

  const ctx = ctxFromReq(user);
  const conversation: MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await getClient().messages.create({
        model: config.anthropicModel,
        max_tokens: MAX_TOKENS,
        system: SERVER_INSTRUCTIONS,
        tools: ANTHROPIC_TOOLS,
        messages: conversation,
      });
      conversation.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        res.json({ reply: text });
        return;
      }

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
    res.status(502).json({ error: "chat_incomplete", message: "Took too many steps to find an answer. Try rephrasing." });
  } catch (err) {
    logger.error({ err }, "chat completion failed");
    res.status(502).json({ error: "chat_failed", message: "Something went wrong. Please try again." });
  }
});
