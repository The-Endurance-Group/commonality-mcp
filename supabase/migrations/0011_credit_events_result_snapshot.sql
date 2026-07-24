-- 0011_credit_events_result_snapshot.sql
-- Adds a jsonb snapshot of what the underlying vendor call actually returned,
-- alongside the existing `target` (what was asked for). Cassidy calls were
-- already recoverable via enrichment_cache; Apify calls (search_prospects,
-- search_company_by_name, search_company_roles, *_posts) have no other
-- persisted record of their result, so this is the only way to show "what
-- came back" for those rows in the usage log.

alter table credit_events add column if not exists result_snapshot jsonb;
