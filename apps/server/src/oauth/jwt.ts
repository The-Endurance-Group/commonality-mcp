import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";

// Claims signed into every Commonality access token. The MCP endpoint and REST
// API trust only these - Clerk authenticates the human, Commonality issues the
// token that scopes them to a workspace.
export const jwtClaimsSchema = z.object({
  sub: z.string(),
  company_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
  plan: z.enum(["free", "pro"]),
  email: z.string().email(),
  // Cross-company superadmin, orthogonal to which company this token's
  // company_id/role point at - see config.superadminEmails.
  is_superadmin: z.boolean().optional(),
});

export type AuthUser = z.infer<typeof jwtClaimsSchema>;
export type SignableClaims = Omit<AuthUser, never>;

const TOKEN_TTL_SECONDS = 60 * 60;          // 1 hour access token
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days refresh token

/** Sign a 1-hour Commonality access token. */
export function signAccessToken(claims: SignableClaims): {
  token: string;
  expiresIn: number;
} {
  const token = jwt.sign(claims, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: config.publicBaseUrl,
  });
  return { token, expiresIn: TOKEN_TTL_SECONDS };
}

/** Sign a 30-day refresh token embedding the same claims. */
export function signRefreshToken(claims: SignableClaims): string {
  return jwt.sign(
    { purpose: "refresh_token", claims },
    config.jwtSecret,
    { algorithm: "HS256", expiresIn: REFRESH_TTL_SECONDS, issuer: config.publicBaseUrl },
  );
}

/** Verify a refresh token and return the embedded claims. Throws on failure. */
export function verifyRefreshToken(token: string): SignableClaims {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
    issuer: config.publicBaseUrl,
  }) as { purpose?: string; claims?: unknown };
  if (decoded.purpose !== "refresh_token") throw new Error("wrong token purpose");
  return jwtClaimsSchema.parse(decoded.claims);
}

/** Verify a Commonality access token and return validated claims. Throws on failure. */
export function verifyAccessToken(token: string): AuthUser {
  const decoded = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
    issuer: config.publicBaseUrl,
  });
  return jwtClaimsSchema.parse(decoded);
}
