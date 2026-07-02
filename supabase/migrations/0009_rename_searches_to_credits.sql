-- 0009_rename_searches_to_credits.sql
-- Usage is now billed as "credits" (1 per Apify actor call or Cassidy
-- enrichment), not "searches" (1 per tool call). Rename the column and
-- recreate increment_usage to match - same atomic upsert, new column name.

alter table monthly_usage rename column searches_used to credits_used;

create or replace function increment_usage(p_company_id uuid, p_month text)
returns int as $$
declare new_count int;
begin
  insert into monthly_usage (company_id, month, credits_used)
  values (p_company_id, p_month, 1)
  on conflict (company_id, month)
  do update set credits_used = monthly_usage.credits_used + 1
  returning credits_used into new_count;
  return new_count;
end;
$$ language plpgsql;
