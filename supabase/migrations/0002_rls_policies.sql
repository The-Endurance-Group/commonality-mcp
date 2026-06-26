-- 0002_rls_policies.sql
-- Row Level Security. A row is visible only when its company_id matches the
-- company_id claim on the caller's JWT. enrichment_cache is intentionally left
-- WITHOUT RLS — it is shared across all tenants by design.
--
-- Note: the application server connects with the Supabase service role key,
-- which BYPASSES RLS. These policies are defense-in-depth for any
-- anon/authenticated access path and encode the tenancy rule at the database
-- layer, as required.

-- Helper: extract the company_id claim from the request JWT as uuid.
-- Returns null when absent/malformed (so no rows match).
create or replace function auth_company_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'company_id', '')::uuid;
$$;

-- companies --------------------------------------------------------------
alter table companies enable row level security;
drop policy if exists companies_tenant_isolation on companies;
create policy companies_tenant_isolation on companies
  for all
  using (id = auth_company_id())
  with check (id = auth_company_id());

-- users ------------------------------------------------------------------
alter table users enable row level security;
drop policy if exists users_tenant_isolation on users;
create policy users_tenant_isolation on users
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- invites ----------------------------------------------------------------
alter table invites enable row level security;
drop policy if exists invites_tenant_isolation on invites;
create policy invites_tenant_isolation on invites
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- employees --------------------------------------------------------------
alter table employees enable row level security;
drop policy if exists employees_tenant_isolation on employees;
create policy employees_tenant_isolation on employees
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- monthly_usage ----------------------------------------------------------
alter table monthly_usage enable row level security;
drop policy if exists monthly_usage_tenant_isolation on monthly_usage;
create policy monthly_usage_tenant_isolation on monthly_usage
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- enrichment_cache -------------------------------------------------------
-- NO RLS. Shared across tenants by design. Left intentionally unprotected.
