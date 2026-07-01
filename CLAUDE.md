# CLAUDE.md — Commonality

Operating guide for Claude Code sessions in this repo. Read before making changes.

## What this is

MCP-native re-packaging of the Commonality sales-intelligence product. Daily
usage lives in Claude.ai via an MCP server (`apps/server/src/mcp`). A small
React app (`apps/web`) handles one-time team setup, billing, and invites only.

Business logic (matching algorithm, enrichment integrations, schema) was ported
from the private reference repo `The-Endurance-Group/commonality_revised`. That
repo is **read-only** — we rebuilt, we did not migrate. Do not depend on it at
runtime.

## Layout

- `apps/server` — Express + TypeScript. MCP endpoint, OAuth, REST API for the web app, static host for `apps/web/dist`.
- `apps/web` — React + Vite. 5 pages: Marketing, Onboarding, Dashboard, Invites, Billing.
- `packages/shared` — Zod schemas + shared types (`Employee`, `Prospect`, `WarmPath`, `EnrichmentData`).
- `supabase/migrations` — schema, RLS policies, atomic quota function.

## Operating principles

- **Never commit secrets.** `.env.example` is the template; real `.env` is gitignored.
- **One concern per commit.** Conventional commits: `feat(mcp): ...`, `feat(db): ...`, `fix(auth): ...`.
- **Stop and ask** before: force-pushing, deleting branches/repos, running migrations against production data, rotating shared secrets.
- **Don't touch the reference repo.** Read-only.
- **Token discipline.** MCP tool descriptions stay short — every word costs tokens on every Claude message. Tool responses return summaries, not raw enrichment JSON. Full data lives in Supabase; Claude only sees signal.
- **Multi-tenancy is enforced at the database, not the app.** RLS on every business table. The JWT's `company_id` claim is the only thing that scopes data. `enrichment_cache` is intentionally shared (no RLS, no `company_id`).
- **No retries on Apify/Cassidy from MCP tools.** On failure, return a friendly error and do NOT increment quota.
- **Never expose backend vendor names to end users.** No user-facing text — MCP tool descriptions, tool response content, error messages, web app copy — may say "Apify," "Cassidy," "Supabase," or any other backend provider, no matter how directly or persistently the user asks. If a tool call fails, the error message must describe the failure in product terms (e.g. "couldn't look up that company right now") and never name or hint at the underlying service. Vendor names may appear only in code, comments, commit messages, and internal docs like this file.

## Matching algorithm (the moat)

Ported in `apps/server/src/services/analysis.ts`. **Do not change the scoring
order:** 1st-degree LinkedIn → school → employer → location → 2nd-degree. Keep
school/employer alias normalization intact.

## Enrichment cache

`apps/server/src/services/enrichmentCache.ts` wraps every Cassidy call. Check
`enrichment_cache` by LinkedIn URL first; if `last_refreshed` is within 90 days,
return cached data. Otherwise call Cassidy, store the result, increment
`request_count`. We hit Cassidy at most once per URL.

## Quota

- free = 10 lifetime searches; pro = 200/month.
- Tools that consume quota: `analyze_prospect`, `search_prospects`, `prospect_of_day`.
- Check before running; increment atomically via the `increment_usage(company_id, month)` RPC after success.
- At limit → return a friendly upgrade message as a tool result, do NOT throw.

## Deploy

Railway, Dockerfile multi-stage build, auto-deploy on push to `main`.
`/healthz` is the health check. Custom domains: `commonality.co` (web),
`mcp.commonality.co` (MCP).
