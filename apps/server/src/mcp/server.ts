import type { McpToolResult, ToolContext, ToolName } from "@commonality/shared";
import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../auth/middleware.js";
import { checkQuota, incrementUsage, quotaExceededMessage } from "../auth/quota.js";
import { logger } from "../logger.js";
import { HANDLERS, TOOL_DEFS } from "./registry.js";

// MCP JSON-RPC 2.0 endpoint. Auth runs first (middleware) so unauthenticated
// calls get 401 + WWW-Authenticate. Quota-consuming tools are gated before
// running and incremented atomically only after a successful (non-error) result.
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

  // Quota gate — at limit returns a friendly message, never throws.
  if (handler.usesQuota) {
    const status = await checkQuota(ctx);
    if (!status.allowed) {
      return { content: [{ type: "text", text: quotaExceededMessage(status, ctx.plan) }], isError: true };
    }
  }

  let result: McpToolResult;
  try {
    result = await handler.run(args, ctx);
  } catch (err) {
    logger.error({ err, tool: name }, "tool execution failed");
    return {
      content: [{ type: "text", text: `${name} failed: ${err instanceof Error ? err.message : "unknown error"}. Please try again.` }],
      isError: true,
    };
  }

  // Increment only on a successful (non-error) result. No charge on failures.
  if (handler.usesQuota && !result.isError) {
    try {
      await incrementUsage(ctx.company_id);
    } catch (err) {
      logger.error({ err, tool: name }, "increment_usage failed (result already returned)");
    }
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
    case "initialize":
      res.json(rpcResult(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO }));
      return;
    case "notifications/initialized":
      res.status(204).end(); // notification — no response body
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
