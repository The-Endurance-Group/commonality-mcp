-- 0004_mcp_tool_support.sql
-- Fields the MCP tools need beyond the starter schema:
--  * company context/website  -> outreach + call-prep generation (analysis.ts)
--  * per-workspace CRM creds   -> push_to_crm
--  * icp_profile               -> prospect_of_day
--  * linkedin_connections      -> upload_connections + 1st-degree warm-path signal

alter table companies
  add column if not exists context text,
  add column if not exists website text,
  add column if not exists linkedin_company_url text,
  add column if not exists hubspot_api_key text,
  add column if not exists salesforce_instance_url text,
  add column if not exists salesforce_client_id text,
  add column if not exists salesforce_client_secret text,
  add column if not exists icp_profile jsonb;

-- 1st-degree LinkedIn connections uploaded from a team member's export.
-- linkedin_url may be null when the export omits it; full_name is the lowercase
-- "first last" fallback used for name-based matching.
create table if not exists linkedin_connections (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  employee_id  uuid not null references employees (id) on delete cascade,
  linkedin_url text,
  full_name    text,
  connected_on text,
  uploaded_at  timestamptz not null default now()
);
create index if not exists linkedin_connections_company_id_idx on linkedin_connections (company_id);
create index if not exists linkedin_connections_employee_id_idx on linkedin_connections (employee_id);
create index if not exists linkedin_connections_url_idx on linkedin_connections (lower(linkedin_url));
create index if not exists linkedin_connections_name_idx on linkedin_connections (lower(full_name));

alter table linkedin_connections enable row level security;
drop policy if exists linkedin_connections_tenant_isolation on linkedin_connections;
create policy linkedin_connections_tenant_isolation on linkedin_connections
  for all
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());
