import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

// Verifies a Clerk session JWT (issued to the React app by Clerk's frontend SDK)
// against Clerk's JWKS. Returns the Clerk user id (sub). Email is fetched
// separately via the Clerk backend API (clerkBackend.ts) so we never trust a
// client-supplied email.

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    const issuer = config.clerkIssuerUrl.replace(/\/$/, "");
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifyClerkSessionToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: config.clerkIssuerUrl.replace(/\/$/, ""),
  });
  if (!payload.sub) throw new Error("Clerk token has no sub");
  return { sub: payload.sub };
}
