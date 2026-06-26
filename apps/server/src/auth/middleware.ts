import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { type AuthUser, verifyAccessToken } from "../oauth/jwt.js";

export type { AuthUser } from "../oauth/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function resourceMetadataUrl(): string {
  return `${config.publicBaseUrl.replace(/\/$/, "")}/.well-known/oauth-protected-resource`;
}

function unauthorized(res: Response): void {
  res
    .status(401)
    .set("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl()}"`)
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
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    logger.debug({ err }, "JWT verification failed");
    unauthorized(res);
  }
}
