-- 0013_chat_usage.sql
-- Per-company daily message counter for the in-app chat (Dashboard "Try it
-- here" panel). This is a cost/abuse guardrail only - chat itself is billed
-- to Commonality's own Anthropic account, not metered by the credit system
-- (the tool calls chat triggers still cost credits normally, via the same
-- chargeCredit() path as MCP). Composite PK (company_id, day) mirrors
-- monthly_usage's (company_id, month) pattern.

create table if not exists chat_usage_daily (
  company_id  uuid not null references companies (id) on delete cascade,
  day         date not null,
  message_count int not null default 0,
  primary key (company_id, day)
);

alter table chat_usage_daily enable row level security;
drop policy if exists chat_usage_daily_tenant_isolation on chat_usage_daily;
create policy chat_usage_daily_tenant_isolation on chat_usage_daily
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

-- Atomic increment-and-return, mirroring increment_usage() for monthly_usage.
create or replace function increment_chat_usage(p_company_id uuid, p_day date)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  insert into chat_usage_daily (company_id, day, message_count)
  values (p_company_id, p_day, 1)
  on conflict (company_id, day)
  do update set message_count = chat_usage_daily.message_count + 1
  returning message_count into v_count;
  return v_count;
end;
$$;
