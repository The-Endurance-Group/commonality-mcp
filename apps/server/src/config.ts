import "dotenv/config";

/** Read a required env var, throwing at boot if missing. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Read an optional env var with a fallback. */
function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: optional("NODE_ENV", "development"),
  publicBaseUrl: optional("PUBLIC_BASE_URL", "http://localhost:8080"),
  corsAllowlist: optional("CORS_ALLOWLIST", "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Clerk (OAuth IdP). Publishable + issuer are non-secret; the OAuth-application
  // client id/secret are what we use as a relying party delegating sign-in to Clerk.
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  clerkIssuerUrl: optional("CLERK_ISSUER_URL", ""),

  // Lazily required — only the subsystems that use them call required().
  // Kept as getters so the server can boot for healthz without every secret set.
  get jwtSecret() {
    return required("JWT_SECRET");
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get clerkSecretKey() {
    return required("CLERK_SECRET_KEY");
  },
  get clerkOAuthClientId() {
    return required("CLERK_OAUTH_CLIENT_ID");
  },
  get clerkOAuthClientSecret() {
    return required("CLERK_OAUTH_CLIENT_SECRET");
  },
} as const;

export const isProd = config.nodeEnv === "production";
