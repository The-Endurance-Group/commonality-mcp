import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let cached: SupabaseClient | null = null;

/**
 * Supabase client using the service role key. This BYPASSES RLS — tenancy must
 * be enforced in application code by always filtering on the caller's
 * company_id (from the JWT). RLS policies remain as defense-in-depth.
 *
 * Lazy singleton so the process can boot (e.g. for /healthz) without Supabase
 * env vars present in local/dev scenarios.
 */
export function db(): SupabaseClient {
  if (!cached) {
    cached = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
