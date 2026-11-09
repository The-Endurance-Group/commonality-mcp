-- 0015_unlimited_credits.sql
-- Per-company "unlimited credits" flag (support/comp override, set from the
-- superadmin console). When true the monthly credit limit is not enforced for
-- that company; usage is still counted and every charge still writes a
-- credit_events audit row. Independent of `plan`, so Stripe/billing and the
-- team-size limit are unaffected.

alter table companies
  add column if not exists unlimited_credits boolean not null default false;
