-- 0007_enable_rls_enrichment_cache.sql
-- Supabase's security advisor flags any public-schema table with RLS disabled
-- (rls_disabled_in_public), even though 0006 already revoked all
-- anon/authenticated grants on enrichment_cache. Enable RLS to satisfy the
-- advisor and add defense-in-depth.
--
-- enrichment_cache stays shared cross-tenant, but only the backend touches it
-- via the service_role key, which BYPASSES RLS. With RLS enabled and NO policy
-- (and no anon/authenticated grants), every non-service-role path is denied.
alter table enrichment_cache enable row level security;
