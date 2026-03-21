# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev           # Start Next.js dev server
npm run build         # prisma generate + next build
npm run lint          # ESLint (Next.js core-web-vitals + TypeScript)
npm run db:migrate    # Run Prisma migrations (uses DIRECT_URL)
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

No test framework is configured.

## Architecture

**Stack:** Next.js 16 (App Router, React 19, TypeScript strict) + PostgreSQL (Supabase) + Prisma 7 ORM + Tailwind CSS 4

This is a multi-tenant investment portfolio tracker. Each user's data is isolated via `userId` fields on all models.

### Data Flow Pattern

Server Actions (`src/actions/`) are the primary data mutation layer. They validate input with Zod, call services, serialize Prisma `Decimal`/`Date` types to plain JS, and return `ActionResult<T>` (success/error union). Mutations call `revalidatePath()` to invalidate cached pages. `React.cache()` deduplicates per-request data fetches.

### Key Architectural Layers

- **Actions** (`src/actions/`) — Server actions for all business logic (transactions, import, assets, holdings, settings)
- **Services** (`src/services/`) — Core domain logic (FIFO holding calculation, price fetching/caching, email parsing)
- **API Routes** (`src/app/api/`) — REST endpoints for OAuth callbacks, price refresh, cron jobs
- **Components** (`src/components/`) — shadcn/ui-based components (Base Nova style)
- **Types** (`src/types/`) — Shared TypeScript types for portfolio, transactions, imports

### Business Logic

- **FIFO cost accounting** in `src/services/holdings.service.ts` — processes transactions chronologically, tracks cost basis lots, sells from oldest first
- **Price management** in `src/services/price.service.ts` — EODHD API with market-hours-aware caching (shorter TTL during EU trading hours)
- **Email import** in `src/actions/import.ts` + `src/lib/myinvestor-funds.ts` — parses MyInvestor fund transaction emails via Gmail OAuth, deduplicates by message ID
- **Vercel cron** updates prices weekdays at 6 PM CET (`api/cron/update-prices`)

### Auth

Supabase Auth with session refresh in middleware (`src/middleware.ts`). `requireAuth()` and `getCurrentUser()` (cached) in `src/lib/auth.ts`. Gmail OAuth is a separate flow for email import.

### i18n

next-intl with `en` and `es` locales. Messages in `src/i18n/messages/{locale}.json`. User locale stored in DB Settings.

### Database

Prisma schema at `prisma/schema.prisma`. Key models: Asset, Transaction, Holding, Price, PriceCache, ImportBatch, Settings, TickerMapping. Uses Supabase pooler (PrismaPg adapter) for serverless compatibility.

### Action Error Handling

`withAction()` wrapper in actions reduces boilerplate. Returns `{ success: true, data }` or `{ success: false, error }`. Zod validates at action entry.

### Financial Precision

Uses `Decimal.js` for all monetary calculations. Prisma `Decimal` fields serialized to `number` before sending to client.
