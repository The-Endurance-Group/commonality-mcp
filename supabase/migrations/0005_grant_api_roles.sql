-- 0005_grant_api_roles.sql
-- Tables created via `supabase db push` (direct Postgres connection) don't get
-- Supabase's automatic role grants the way SQL-editor-created tables do, so the
-- PostgREST roles (anon, authenticated, service_role) were denied table access.
-- Grant them here and set default privileges for future objects.
--
-- Security note: anon/authenticated remain gated by RLS (0002/0004).
-- service_role bypasses RLS by design and is used only by the backend.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
