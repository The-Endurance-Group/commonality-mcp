-- 0006_unlock_billing_and_lockdown.sql
-- (1) Per-company "unlock once" billing: a credit is charged the first time a
--     company analyzes a given LinkedIn URL; re-analysing the same prospect is
--     free. (2) Lock down the API roles: the backend uses the service_role key
--     exclusively, so remove anon/authenticated access entirely (0005 had
--     granted it broadly) — this closes the enrichment_cache open door.

create table if not exists prospect_unlocks (
  company_id   uuid not null references companies (id) on delete cascade,
  linkedin_url text not null,
  unlocked_at  timestamptz not null default now(),
  primary key (company_id, linkedin_url)
);
create index if not exists prospect_unlocks_company_idx on prospect_unlocks (company_id);

alter table prospect_unlocks enable row level security;
drop policy if exists prospect_unlocks_tenant_isolation on prospect_unlocks;
create policy prospect_unlocks_tenant_isolation on prospect_unlocks
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- Hardening: nothing legitimately uses the anon/publishable key (the web app
-- authenticates with Clerk + our own JWT). Revoke all anon/authenticated access
-- and stop granting it to future objects. The service_role (backend) keeps full
-- access and bypasses RLS by design.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
