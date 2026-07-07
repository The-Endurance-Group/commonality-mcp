-- 0010_credit_events.sql
-- Per-charge audit log so admins can see who used credits, when, and on what
-- (Billing page usage log). Distinct from monthly_usage - that table is only
-- ever an aggregate counter. Only actual charges are logged here (the free
-- "already unlocked" dedupe path in chargeCredit() does not insert a row -
-- nothing new was billed, so there's nothing to audit).

create table if not exists credit_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  user_id     uuid references users (id) on delete set null,
  action      text not null,
  target      text,
  created_at  timestamptz not null default now()
);
create index if not exists credit_events_company_id_created_at_idx
  on credit_events (company_id, created_at desc);

alter table credit_events enable row level security;
drop policy if exists credit_events_tenant_isolation on credit_events;
create policy credit_events_tenant_isolation on credit_events
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());
