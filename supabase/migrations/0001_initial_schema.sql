-- 0001_initial_schema.sql
-- Core tables for Commonality (MCP rebuild).
-- Multi-tenancy: every business table carries company_id and is scoped by RLS
-- (see 0002). enrichment_cache is the deliberate exception — it is shared across
-- all tenants and has no company_id and no RLS.

create extension if not exists "pgcrypto";

-- Plan tier for a workspace.
do $$ begin
  create type plan_tier as enum ('free', 'pro');
exception when duplicate_object then null;
end $$;

-- Role of a user within a company.
do $$ begin
  create type user_role as enum ('admin', 'member');
exception when duplicate_object then null;
end $$;

-- companies --------------------------------------------------------------
create table if not exists companies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  domain             text unique,
  plan               plan_tier not null default 'free',
  stripe_customer_id text unique,
  created_at         timestamptz not null default now()
);

-- users ------------------------------------------------------------------
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  email       text not null unique,
  role        user_role not null default 'member',
  created_at  timestamptz not null default now()
);
create index if not exists users_company_id_idx on users (company_id);

-- invites ----------------------------------------------------------------
create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  email       text not null,
  invited_by  uuid references users (id) on delete set null,
  accepted    boolean not null default false,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  created_at  timestamptz not null default now()
);
create index if not exists invites_company_id_idx on invites (company_id);
create index if not exists invites_email_idx on invites (lower(email));

-- employees --------------------------------------------------------------
-- The team roster whose collective network we mine for warm paths.
create table if not exists employees (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  linkedin_url   text not null,
  name           text,
  schools        jsonb not null default '[]'::jsonb,
  past_companies jsonb not null default '[]'::jsonb,
  location       text,
  enriched_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (company_id, linkedin_url)
);
create index if not exists employees_company_id_idx on employees (company_id);

-- enrichment_cache -------------------------------------------------------
-- INTENTIONALLY shared across all tenants. No company_id, no RLS.
-- Keyed by LinkedIn URL so we hit Cassidy at most once per profile.
create table if not exists enrichment_cache (
  linkedin_url   text primary key,
  enriched_data  jsonb not null,
  last_refreshed timestamptz not null default now(),
  request_count  int not null default 1
);

-- monthly_usage ----------------------------------------------------------
-- Composite PK (company_id, month). month is 'YYYY-MM'.
create table if not exists monthly_usage (
  company_id    uuid not null references companies (id) on delete cascade,
  month         text not null,
  searches_used int not null default 0,
  primary key (company_id, month)
);
