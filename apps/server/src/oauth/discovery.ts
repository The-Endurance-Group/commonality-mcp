import { Router, type Router as RouterType } from "express";
import { config } from "../config.js";

// OAuth 2.1 discovery. Commonality is the authorization server the MCP client
// (Claude) talks to - it issues the access token the /mcp endpoint accepts.
// User authentication is delegated to Clerk behind /oauth/authorize.
export const discoveryRouter: RouterType = Router();

function base(): string {
  return config.publicBaseUrl.replace(/\/$/, "");
}

discoveryRouter.get("/oauth-authorization-server", (_req, res) => {
  res.json({
    issuer: base(),
    authorization_endpoint: `${base()}/oauth/authorize`,
    token_endpoint: `${base()}/oauth/token`,
    registration_endpoint: `${base()}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["openid", "email", "profile"],
  });
});

discoveryRouter.get("/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: `${base()}/mcp`,
    authorization_servers: [base()],
    bearer_methods_supported: ["header"],
  });
});
