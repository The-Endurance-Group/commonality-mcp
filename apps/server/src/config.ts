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
} as const;

export const isProd = config.nodeEnv === "production";
