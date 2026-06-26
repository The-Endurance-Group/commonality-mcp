-- 0003_atomic_quota_function.sql
-- Race-safe per-month usage increment. Upsert + atomic +1 in a single
-- statement so concurrent tool calls cannot lose updates. Returns the new
-- searches_used count for the (company_id, month) row.

create or replace function increment_usage(p_company_id uuid, p_month text)
returns int as $$
declare new_count int;
begin
  insert into monthly_usage (company_id, month, searches_used)
  values (p_company_id, p_month, 1)
  on conflict (company_id, month)
  do update set searches_used = monthly_usage.searches_used + 1
  returning searches_used into new_count;
  return new_count;
end;
$$ language plpgsql;
