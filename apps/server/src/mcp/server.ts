import type { McpToolResult, ToolContext, ToolName } from "@commonality/shared";
import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../auth/middleware.js";
import { checkQuota, quotaExceededMessage, usageThresholdNotice } from "../auth/quota.js";
import { logger } from "../logger.js";
import { appendFreeTrialTip } from "./freeTrialTips.js";
import { HANDLERS, TOOL_DEFS } from "./registry.js";

// MCP JSON-RPC 2.0 endpoint. Auth runs first (middleware) so unauthenticated
// calls get 401 + WWW-Authenticate. Credits (1 per Apify/Cassidy vendor call)
// are charged inline by each tool via chargeCredit(), not centrally here -
// this handler only does a cheap up-front fast-path block if already over
// the limit, and a before/after usage diff to surface a threshold notice.
export const mcpRouter: RouterType = Router();

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "commonality", version: "0.1.0" };

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: RpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, result };
}
function rpcError(id: RpcRequest["id"], code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0" as const, id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

function ctxFromReq(user: NonNullable<Express.Request["user"]>): ToolContext {
  return {
    company_id: user.company_id,
    user_id: user.user_id,
    role: user.role,
    plan: user.plan,
    email: user.email,
  };
}

async function handleToolCall(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const handler = HANDLERS[name as ToolName];
  if (!handler) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }

  // Fast path: if this company is already at/over its credit limit, block
  // before running the tool at all - individual vendor calls inside the
  // handler (via chargeCredit) enforce the same limit mid-call too.
  const before = await checkQuota(ctx);
  if (!before.allowed) {
    return { content: [{ type: "text", text: quotaExceededMessage(before, ctx.plan, ctx.role) }], isError: true };
  }

  let result: McpToolResult;
  try {
    result = await handler.run(args, ctx);
  } catch (err) {
    logger.error({ err, tool: name }, "tool execution failed");
    return {
      content: [{ type: "text", text: `${name} failed. Please try again.` }],
      isError: true,
    };
  }

  // Surface a one-time notice if this call's credit charges crossed a new
  // 50/75/90/100% threshold - replaces proactively stating "N remaining"
  // before/after every call. Otherwise, free-plan users still get the
  // occasional feature-discovery tip after a charged call.
  try {
    const after = await checkQuota(ctx);
    if (after.used > before.used) {
      const notice = usageThresholdNotice(before.used, after.used, after.limit, ctx.plan, ctx.role);
      if (notice) {
        const content = result.content.map((c, i) =>
          i === result.content.length - 1 && c.type === "text" ? { ...c, text: `${c.text}\n\n⚠️ ${notice}` } : c,
        );
        result = { ...result, content };
      } else if (ctx.plan === "free") {
        result = appendFreeTrialTip(result, after.used, ctx.role);
      }
    }
  } catch (err) {
    logger.error({ err, tool: name }, "usage notice check failed (result already returned)");
  }
  return result;
}

mcpRouter.post("/", requireAuth, async (req, res) => {
  const body = req.body as RpcRequest;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    res.status(400).json(rpcError(body?.id ?? null, -32600, "Invalid Request"));
    return;
  }

  const { id, method, params } = body;

  switch (method) {
    case "initialize": {
      // Echo the client's requested protocol version if it sent one, rather
      // than always asserting ours - keeps us honest with the MCP spec's
      // negotiation model.
      const requestedVersion = params?.protocolVersion;
      const protocolVersion = typeof requestedVersion === "string" ? requestedVersion : PROTOCOL_VERSION;
      res.json(rpcResult(id, { protocolVersion, capabilities: { tools: {} }, serverInfo: SERVER_INFO }));
      return;
    }
    case "notifications/initialized":
      res.status(204).end(); // notification - no response body
      return;
    case "ping":
      res.json(rpcResult(id, {}));
      return;
    case "tools/list":
      res.json(rpcResult(id, { tools: TOOL_DEFS }));
      return;
    case "tools/call": {
      const name = params?.name as string | undefined;
      const args = (params?.arguments as Record<string, unknown> | undefined) ?? {};
      if (!name) {
        res.json(rpcError(id, -32602, "Missing tool name"));
        return;
      }
      const result = await handleToolCall(ctxFromReq(req.user!), name, args);
      res.json(rpcResult(id, result));
      return;
    }
    default:
      res.json(rpcError(id, -32601, `Method not found: ${method}`));
  }
});
