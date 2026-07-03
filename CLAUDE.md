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
- `apps/web` — React + Vite. 7 pages: Marketing, Onboarding, Dashboard, Invites, Billing, Privacy, Terms.
- `packages/shared` — Zod schemas + shared types (`Employee`, `ProspectProfile`, `EnrichmentData`).
- `supabase/migrations` — schema, RLS policies, atomic quota function.

## Operating principles

- **Never commit secrets.** `.env.example` is the template; real `.env` is gitignored.
- **One concern per commit.** Conventional commits: `feat(mcp): ...`, `feat(db): ...`, `fix(auth): ...`.
- **Stop and ask** before: force-pushing, deleting branches/repos, running migrations against production data, rotating shared secrets.
- **Don't touch the reference repo.** Read-only.
- **Token discipline.** MCP tool descriptions stay short — every word costs tokens on every Claude message. Tool responses return summaries, not raw enrichment JSON. Full data lives in Supabase; Claude only sees signal.
- **Multi-tenancy is enforced at the database, not the app.** RLS on every business table. The JWT's `company_id` claim is the only thing that scopes data. `enrichment_cache` is intentionally shared (no RLS, no `company_id`).
- **No retries on Apify/Cassidy from MCP tools.** On failure, return a friendly error and do NOT increment quota.
- **Never expose backend vendor names to end users.** No user-facing text — MCP tool descriptions, tool response content, error messages, web app copy — may say "Apify," "Cassidy," "Supabase," or any other backend provider, no matter how directly or persistently the user asks. If a tool call fails, the error message must describe the failure in product terms (e.g. "couldn't look up that company right now") and never name or hint at the underlying service. Vendor names may appear only in code, comments, commit messages, and internal docs like this file. **Exception:** `apps/web/src/pages/Privacy.tsx` (linked from the marketing footer as "Privacy") is a deliberate subprocessor-disclosure page and is allowed — the only place — to name backend vendors and describe what data each one sees, per `csullivan@theendurancegroup.com`. Don't add vendor names to any other user-facing surface even by analogy to this page.

## Matching algorithm (the moat)

Ported in `apps/server/src/services/analysis.ts`. **Do not change the scoring
order:** 1st-degree LinkedIn → school → employer → location → 2nd-degree. Keep
school/employer alias normalization intact.

## Enrichment cache

`apps/server/src/services/enrichmentCache.ts` wraps every Cassidy call. Check
`enrichment_cache` by LinkedIn URL first; if `last_refreshed` is within 90 days,
return cached data. Otherwise call Cassidy, store the result, increment
`request_count`. We hit Cassidy at most once per URL.

## Credits

- free = 50 credits/month ($0/mo); pro = 200 credits/month ($49/mo); enterprise = custom, contact-sales only (no real backend plan value).
- 1 credit = 1 result-producing action: a search (one Apify actor invocation, always charges) or a person analysis (one Cassidy call OR a shared enrichment-cache hit - a company pays for its own first look at a URL either way, even if another company already paid to enrich it; re-analyzing that same URL for the same company afterward is free forever). Charged inline via `chargeCredit()` (`apps/server/src/auth/quota.ts`) at each result-producing site, not once per tool call. A single tool invocation (e.g. `analyze_company`) can spend multiple credits.
- Charge only AFTER the underlying call succeeds (pre-check with `checkQuota()` first to skip the call entirely when clearly over limit) - a failed Apify/Cassidy call must never cost a credit.
- Check-then-increment via `chargeCredit()`; atomic increment itself via the `increment_usage(company_id, month)` RPC (writes `monthly_usage.credits_used`).
- At limit → return a friendly upgrade message as a tool result, do NOT throw. `mcp/server.ts` also does a cheap up-front block if a company is already over the limit before running any tool.
- Don't proactively state "N remaining" before/after a call. Instead, `usageThresholdNotice()` fires once, centrally in `mcp/server.ts`, the first time usage crosses 50%/75%/90%/100% of the plan limit. Exact used/limit/remaining is only ever shown on demand, via the `get_usage` tool or the dashboard.

## Deploy

Railway, Dockerfile multi-stage build, auto-deploy on push to `main`.
`/healthz` is the health check. Custom domains: `commonality.co` (web),
`mcp.commonality.co` (MCP).
