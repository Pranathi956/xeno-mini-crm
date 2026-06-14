# Xeno Mini CRM

An AI-native Mini CRM for Indian retail brands — lets marketers create customer segments and send campaigns using plain-English AI chat powered by Groq.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/crm run dev` — run the frontend (dynamic port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (wouter routing, TanStack Query, Tailwind CSS v4)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: Groq API (`llama3-70b-8192`) — user supplies their own API key
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (customers, orders, campaigns, communications, campaign_stats)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/crm/src/pages/` — React pages (dashboard, ai-campaigns, campaigns, customers)
- `artifacts/crm/src/components/layout/AppLayout.tsx` — Sidebar navigation

## Architecture decisions

- Channel service simulation is built INTO the Express API server via `setTimeout` fire-and-forget, rather than a separate service. Mimics 80% delivery, 60% open, 40% click rates with realistic delays.
- AI API key is stored in `localStorage` under `"groq_api_key"` and sent as `x-api-key` header — never stored server-side.
- Segment queries are validated to block SQL injection (forbidden keyword list) and camelCase field names are remapped to snake_case DB columns before execution.
- The `/api/seed` endpoint deletes and re-seeds 50 realistic Indian customers + 200 orders on each call.

## Product

- Dashboard: stat cards (customers, revenue ₹, campaigns, delivery rate) + recent campaigns table + Seed DB button
- AI Campaign Creator: Groq-powered chat assistant that extracts audience segment (SQL WHERE clause), message draft, and channel from plain English; live preview panel shows matching customer count; one-click launch
- Campaigns: full table with delivery/open rate badges, stats per campaign
- Customers: searchable table with spend/visit data in ₹

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Segment queries use raw SQL via `db.execute(sql.raw(...))` — keep the injection guard in `segments.ts` and `campaigns.ts` updated if schema changes.
- The Orval codegen rule: response component schemas must NOT be named `<OperationIdPascal>Response` (e.g. `AiChatResponse` → renamed to `AiReply` to avoid TS2308 collision).
- Wouter v3 `<Link>` renders directly as `<a>` — don't wrap it in another `<a>`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
