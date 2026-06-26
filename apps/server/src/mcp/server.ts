import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../auth/middleware.js";

// MCP JSON-RPC 2.0 handler. Full implementation (initialize / tools/list /
// tools/call dispatch + quota gate) lands in Phase 6. The auth middleware is
// already wired so the endpoint returns 401 (with WWW-Authenticate) when
// unauthenticated — one of the success criteria in the brief.
export const mcpRouter: RouterType = Router();

mcpRouter.post("/", requireAuth, (_req, res) => {
  res.status(501).json({
    jsonrpc: "2.0",
    error: { code: -32601, message: "not_implemented", data: { phase: 6 } },
    id: null,
  });
});
