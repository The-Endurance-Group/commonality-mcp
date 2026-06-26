# Commonality

MCP-native sales intelligence — Commonality as a Claude connector + minimal web app for setup, billing, and invites.

Daily usage happens inside Claude.ai via an MCP server. The React web app handles one-time team setup, billing, and teammate invites only.

## Architecture

A pnpm monorepo deployed as a single Railway service. One Express server hosts both the MCP endpoint and the React static build.

```
apps/server     Express + TypeScript — MCP endpoint, OAuth, REST API, static host
apps/web        React + Vite — marketing, onboarding, dashboard, invites, billing
packages/shared Zod schemas + shared TypeScript types
supabase        SQL migrations (schema, RLS, atomic quota fn)
```

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in real values — never commit .env
pnpm --filter server dev
pnpm --filter web dev
```

## Build process

This repo was generated from the build brief in
`COMMONALITY_BUILD_INSTRUCTIONS.md` (kept outside this repo). See
[CLAUDE.md](./CLAUDE.md) for operating principles and conventions for
future Claude Code sessions.

## Stack

- **MCP server** — JSON-RPC 2.0 over HTTP, 11 tools, JWT-gated
- **Auth** — OAuth 2.1 discovery + Commonality-issued JWT (Clerk as the IdP)
- **DB** — Supabase (Postgres) with Row Level Security scoped by `company_id`
- **Billing** — Stripe checkout + customer portal + webhooks
- **Email** — Resend for invites
- **Enrichment** — Apify (LinkedIn) + Cassidy (profile enrichment), shared cache
- **CRM push** — HubSpot + Salesforce

## License

Private — The Endurance Group.
