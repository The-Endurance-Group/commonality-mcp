-- 0012_canonicalize_linkedin_urls.sql
-- Fixes the root cause of duplicate roster rows / possible double-billing:
-- linkedin_url values were only trimmed + trailing-slash-stripped (roster),
-- or trimmed + lowercased + trailing-slash-stripped (prospect unlock dedup),
-- or not normalized at all (enrichment_cache). Two URL strings for the same
-- real profile - differing in case, "www.", http vs https, a trailing
-- slash, or a tracking query string/fragment - were treated as different
-- people/keys. This migration (1) adds a canonicalize_linkedin_url() SQL
-- function matching the app's new canonicalizeLinkedInUrl() in
-- apps/server/src/lib/linkedinUrl.ts, and (2) merges existing duplicate rows
-- in enrichment_cache, employees, and prospect_unlocks onto their canonical
-- URL. Safe to re-run - a second run is a no-op once everything is already
-- canonical.

create or replace function canonicalize_linkedin_url(u text)
returns text language plpgsql immutable as $$
declare
  s text := lower(trim(u));
begin
  if s = '' then return s; end if;
  s := regexp_replace(s, '^https?://', '');
  s := regexp_replace(s, '^www\.', '');
  s := regexp_replace(s, '[?#].*$', '');
  s := regexp_replace(s, '/+$', '');
  return 'https://' || s;
end;
$$;

-- --- enrichment_cache (shared, global, PK linkedin_url) ---------------------
-- Keep the most-recently-refreshed row per canonical URL; sum request_count
-- across merged duplicates so the popularity counter stays meaningful.
create temporary table ec_canon on commit drop as
  select linkedin_url as old_url, canonicalize_linkedin_url(linkedin_url) as canon,
         last_refreshed, request_count
  from enrichment_cache;

create temporary table ec_winner on commit drop as
  select distinct on (canon) canon, old_url as winner_url
  from ec_canon
  order by canon, last_refreshed desc;

create temporary table ec_sum on commit drop as
  select canon, sum(request_count) as total_requests
  from ec_canon
  group by canon;

delete from enrichment_cache ec
using ec_canon c
join ec_winner w on w.canon = c.canon
where ec.linkedin_url = c.old_url and c.old_url <> w.winner_url;

update enrichment_cache ec
set linkedin_url = w.canon,
    request_count = s.total_requests
from ec_winner w
join ec_sum s on s.canon = w.canon
where ec.linkedin_url = w.winner_url;

-- --- employees (per company, unique on company_id+linkedin_url) ------------
-- Prefer keeping the already-enriched row, then the oldest. Before deleting a
-- losing row, reparent its uploaded linkedin_connections and any roster
-- self-claim onto the surviving row so nothing is silently lost.
create temporary table emp_canon on commit drop as
  select id, company_id, linkedin_url as old_url,
         canonicalize_linkedin_url(linkedin_url) as canon,
         enriched_at, created_at, claimed_by_user_id
  from employees;

create temporary table emp_winner on commit drop as
  select distinct on (company_id, canon) company_id, canon, id as winner_id, old_url as winner_url
  from emp_canon
  order by company_id, canon, (enriched_at is null) asc, created_at asc;

-- Reparent uploaded connections from losing rows onto the winner.
update linkedin_connections lc
set employee_id = w.winner_id
from emp_canon c
join emp_winner w on w.company_id = c.company_id and w.canon = c.canon
where lc.employee_id = c.id and c.id <> w.winner_id;

-- Carry over a self-claim the winner doesn't already have.
update employees e
set claimed_by_user_id = c.claimed_by_user_id
from emp_canon c
join emp_winner w on w.company_id = c.company_id and w.canon = c.canon
where e.id = w.winner_id
  and e.claimed_by_user_id is null
  and c.id <> w.winner_id
  and c.claimed_by_user_id is not null;

delete from employees e
using emp_canon c
join emp_winner w on w.company_id = c.company_id and w.canon = c.canon
where e.id = c.id and c.id <> w.winner_id;

update employees e
set linkedin_url = w.canon
from emp_winner w
where e.id = w.winner_id and e.linkedin_url <> w.canon;

-- --- prospect_unlocks (per company, PK company_id+linkedin_url) ------------
-- Keep the earliest unlock per canonical URL (that's genuinely when the
-- company first paid for it).
create temporary table pu_canon on commit drop as
  select company_id, linkedin_url as old_url,
         canonicalize_linkedin_url(linkedin_url) as canon,
         unlocked_at
  from prospect_unlocks;

create temporary table pu_winner on commit drop as
  select distinct on (company_id, canon) company_id, canon, old_url as winner_url
  from pu_canon
  order by company_id, canon, unlocked_at asc;

delete from prospect_unlocks pu
using pu_canon c
join pu_winner w on w.company_id = c.company_id and w.canon = c.canon
where pu.company_id = c.company_id and pu.linkedin_url = c.old_url and c.old_url <> w.winner_url;

update prospect_unlocks pu
set linkedin_url = w.canon
from pu_winner w
where pu.company_id = w.company_id and pu.linkedin_url = w.winner_url and pu.linkedin_url <> w.canon;
