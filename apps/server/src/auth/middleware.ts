import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { logger } from "../logger.js";

/** Claims we sign into every Commonality JWT. */
export const jwtClaimsSchema = z.object({
  sub: z.string(),
  company_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
  plan: z.enum(["free", "pro"]),
  email: z.string().email(),
});

export type AuthUser = z.infer<typeof jwtClaimsSchema>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const RESOURCE_METADATA_URL =
  "https://commonality.co/.well-known/oauth-protected-resource";

function unauthorized(res: Response): void {
  res
    .status(401)
    .set(
      "WWW-Authenticate",
      `Bearer resource_metadata="${RESOURCE_METADATA_URL}"`,
    )
    .json({ error: "unauthorized" });
}

/**
 * Validate the Bearer JWT and attach the decoded claims to req.user.
 * On any failure, respond 401 with the WWW-Authenticate header that points
 * Claude at our protected-resource metadata.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    unauthorized(res);
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = jwtClaimsSchema.parse(decoded);
    next();
  } catch (err) {
    logger.debug({ err }, "JWT verification failed");
    unauthorized(res);
  }
}
