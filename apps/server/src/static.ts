import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Serve the built React app and fall back to index.html for client-side routes.
 * In the Docker image the web build is copied to /app/apps/web/dist; in local
 * dev it lives at ../../web/dist relative to this file. We resolve whichever
 * exists.
 */
export function mountStatic(app: Express): void {
  const candidates = [
    path.resolve(__dirname, "../../web/dist"),
    path.resolve(process.cwd(), "apps/web/dist"),
  ];
  const webDist = candidates.find((p) => existsSync(p));

  if (!webDist) {
    // No build present (e.g. server-only dev). Skip — API/MCP still work.
    return;
  }

  app.use(express.static(webDist));

  // SPA catch-all: any non-API, non-MCP GET serves index.html.
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/mcp") ||
      req.path.startsWith("/oauth") ||
      req.path.startsWith("/.well-known")
    ) {
      next();
      return;
    }
    res.sendFile(path.join(webDist, "index.html"));
  });
}
