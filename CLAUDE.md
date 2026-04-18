# FinSight AI — Claude Code Guide

---

## Loan Optimisation Engine (v3 — Fixed)

### Overview

The Loan Optimisation module computes optimal repayment strategies using deterministic
month-by-month amortization. AI is used ONLY for plain-language explanation — it never
performs calculations or overrides algorithmic results.

For detailed guidelines, see:

- [API Guidelines](docs/api-guidelines.md) — endpoints, response schema, strategy selection, performance constraints
- [DB Guidelines](docs/db-guidelines.md) — tables, RLS, migrations, storage rules
- [AI Guidelines](docs/ai-guidelines.md) — what AI may/must not do, model, service files
- [Simulation Guidelines](docs/simulation-guidelines.md) — strategies, month-by-month rules, baseline logic
- [Frontend Guidelines](docs/frontend-guidelines.md) — page layout order, key files, data rules

### Key Files

| File | Role |
|------|------|
| `backend/services/loan_optimizer.py` | Deterministic simulation — `_simulate` (strategy), `_baseline` (no-strategy), `optimize_loans` (orchestrator) |
| `backend/services/ai_service.py` | All Anthropic calls (Sonnet for reasoning) |
| `backend/services/context_builder.py` | Compact context assembly for AI prompts |
| `backend/routes/loans.py` | REST: GET /v1/loans, POST /v1/loans, POST /v1/loans/optimize |
| `backend/schemas/loan_schema.py` | Pydantic models |
| `backend/db/migrations/002_loans_tables.sql` | DDL for loans + loan_strategies with RLS |
| `frontend/app/loans/page.tsx` | Live loans page — real API, no hardcoded data |
| `frontend/app/api/loans/route.ts` | Next.js proxy → GET + POST /v1/loans |
| `frontend/app/api/loans/optimize/route.ts` | Next.js proxy → POST /v1/loans/optimize |
| `frontend/lib/types/loan.ts` | TypeScript types for all loan/optimizer shapes |

---

## Currency System

### Overview

Currency is resolved from the user's `user_profiles` row (`currency` ISO 4217 code, or derived from `country` ISO 3166 alpha-2 via `getCurrencyCode()`). A single `CurrencyProvider` at the root layout fetches the profile once and exposes `currencyCode`, `currencySymbol`, `formatCurrency`, and `formatCompactCurrency` via `useCurrency()`.

### Rules

- **`CurrencyProvider` must stay in `frontend/app/layout.tsx`** (root layout). It wraps the entire app so `useCurrency()` is never called outside the context. Moving it into a page-level component (e.g. `DashboardLayout`) causes the hook to fall back to USD for any page that calls `useCurrency()` at the top of its component body.
- All monetary display must go through `formatCurrency` / `formatCompactCurrency` from `useCurrency()`. Do not hardcode `$` or `USD`.

### Key Files

| File | Role |
|------|------|
| `frontend/app/layout.tsx` | Mounts `CurrencyProvider` at the root |
| `frontend/lib/hooks/useCurrency.tsx` | `CurrencyProvider` + `useCurrency()` hook |
| `frontend/lib/utils/countryToCurrency.ts` | ISO country→currency map, `getCurrencyCode()`, `getCurrencySymbolFromCode()` |
| `frontend/lib/utils/currencyMap.ts` | Country→symbol convenience map |
| `frontend/app/api/profile/me/route.ts` | Next.js proxy → `GET /v1/profile/me` (used by CurrencyProvider) |