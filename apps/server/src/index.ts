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
import { authRouter } from "./api/auth.js";
import { handleWebhookEvent } from "./services/stripe.js";
import { logger as log } from "./logger.js";
import { mountStatic } from "./static.js";

const app = express();

// CSP is disabled (only this directive) because the React app loads Clerk's SDK
// from *.clerk.accounts.dev and connects to Clerk's API; helmet's default
// script-src 'self' would block it. All other helmet protections stay on.
// TODO: replace with a tightened CSP that allowlists the exact Clerk origins.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: config.corsAllowlist,
    credentials: true,
  }),
);
app.use(pinoHttp({ logger }));

// Stripe webhook — MUST be mounted with the raw body BEFORE express.json() so
// the signature can be verified against the exact bytes Stripe sent.
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("stripe-signature");
  if (!signature) {
    res.status(400).json({ error: "missing signature" });
    return;
  }
  try {
    await handleWebhookEvent(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err) {
    log.warn({ err }, "stripe webhook rejected");
    res.status(400).json({ error: "invalid webhook" });
  }
});

app.use(express.json({ limit: "5mb" }));

// Mount order per the build brief:
// 1. OAuth discovery
app.use("/.well-known", discoveryRouter);
// 2. OAuth endpoints
app.use("/oauth", oauthRouter);
// 3. MCP JSON-RPC (requires Bearer JWT)
app.use("/mcp", mcpRouter);
// 4. REST API for the React app
//    4a. Session exchange (Clerk -> Commonality JWT) — must precede the gated router.
app.use("/api/auth", authRouter);
//    4b. Everything else (requires Bearer Commonality JWT)
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
