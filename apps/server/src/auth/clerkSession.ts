import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

// Verifies a Clerk session JWT against Clerk's JWKS.
// Email is read directly from the JWT's custom `email` claim (configured in
// Clerk dashboard → Sessions → Customize session token → {"email": "{{user.primary_email_address}}"}).
// This eliminates the Clerk backend API call that previously caused 50s+ hangs.

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const issuer = config.clerkIssuerUrl.replace(/\/$/, "");
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifyClerkSessionToken(token: string): Promise<{ sub: string; email: string }> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: config.clerkIssuerUrl.replace(/\/$/, ""),
  });
  if (!payload.sub) throw new Error("Clerk token has no sub");
  const email = payload["email"];
  if (typeof email !== "string" || !email) throw new Error("Clerk token missing email claim — add {{user.primary_email_address}} in Clerk dashboard → Sessions");
  return { sub: payload.sub, email };
}
