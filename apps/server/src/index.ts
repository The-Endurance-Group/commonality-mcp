import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { discoveryRouter } from "./oauth/discovery.js";
import { oauthRouter } from "./oauth/routes.js";
import { mcpRouter } from "./mcp/server.js";
import { apiRouter } from "./api/index.js";
import { mountStatic } from "./static.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsAllowlist,
    credentials: true,
  }),
);
app.use(pinoHttp({ logger }));

// NOTE (Phase 8): the Stripe webhook route must be mounted with
// express.raw() BEFORE express.json() so the raw body is available for
// signature verification. It will be added above this json() line.
app.use(express.json({ limit: "5mb" }));

// Mount order per the build brief:
// 1. OAuth discovery
app.use("/.well-known", discoveryRouter);
// 2. OAuth endpoints
app.use("/oauth", oauthRouter);
// 3. MCP JSON-RPC (requires Bearer JWT)
app.use("/mcp", mcpRouter);
// 4. REST API for the React app (requires Bearer JWT)
app.use("/api", apiRouter);
// 5. Health check
app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});
// 6. Static SPA (catch-all) — must be last
mountStatic(app);

app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv },
    "commonality server listening",
  );
});
