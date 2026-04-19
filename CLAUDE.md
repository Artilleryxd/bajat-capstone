# FinSight AI — Claude Code Guide

---

## UI Development Rule

**Always invoke the `/frontend-design` skill before writing any new UI code or modifying existing components.** This applies to new pages, new components, and any non-trivial changes to existing frontend files.

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

## Investment Strategy Module

### Overview

Generates an AI-powered investment strategy from the user's live financial data (profile, loans, assets). No specific funds or securities are ever recommended — only asset class percentages. The module supports temporary profile overrides for "what-if" simulations (not persisted to DB).

### Key behaviours

- **Risk score** is calculated deterministically (TRD §10.3): age, income type, dependents, DTI, net worth, investment experience.
- **Debt-heavy check**: DTI ≥ 40% → `is_debt_heavy = true` → prominent warning card + conservative allocation.
- **First-time flow**: `GET /v1/investment/latest` checks `investment_strategies` table first. If an active row exists it is returned immediately. Only if no row exists does it fall through to check `user_profiles.investment_goal`. No goal → 404 → frontend shows goal setup form (goal amount, current portfolio value, SIP date, payout_date). This ordering means unapplied profile-column migrations never block the strategy view.
- **Temporary overrides**: `POST /v1/investment/strategy` with `overrides` field → strategy is generated but NOT saved to DB → frontend shows "Simulated view" banner.
- **Portfolio upload**: PDF/CSV/XLSX/image → `POST /v1/investment/parse-portfolio` → returns `portfolio_text` + `estimated_return_pct`.
- **SIP alignment with budget**: `recommended_sip` = investment total from the user's latest budget row. `required_sip_for_goal` = deterministic goal-math (what is needed to hit goal by payout_date). A callout banner on the investments page shows green (on track) or amber (short by X/month). The AI insight paragraph 3 always addresses goal reachability explicitly.
- **Budget debt-heavy mode**: EMI-to-income ≥ 40% → budget AI is instructed to allocate nothing to investments/emergency; `is_debt_heavy = true` is returned in `BudgetOutput`; frontend shows a destructive warning banner and hides investment/emergency sections.

### DB columns — `investment_strategies`

All columns (create table query in `backend/db/migrations/004_investment_strategies.sql` superseded by later migrations):

| Column | Type | Added by |
|--------|------|----------|
| id, user_id, risk_score, risk_profile, allocations, investable_surplus, ai_rationale, risk_explanation, ai_insights, debt_warning, is_debt_heavy, goal_amount, current_portfolio_value, sip_date, portfolio_text, goal_projection, estimated_annual_return, time_horizon, is_active, created_at | various | 004 |
| payout_date | DATE | 012 |
| recommended_sip, required_sip_for_goal | NUMERIC(12,2) | 013 |
| target_goal | TEXT | 014 |

### DB columns — `user_profiles` (investment-related)

| Column | Type | Added by |
|--------|------|----------|
| investment_goal | NUMERIC(15,2) | 011 |
| current_portfolio | NUMERIC(15,2) | 011 |
| sip_date | SMALLINT | 011 |
| payout_date | DATE | 012 |
| target_goal | TEXT | 014 |

### Pending migrations (apply in order if not yet run)

```
backend/db/apply_migration_011.py   → user_profiles investment fields + pg_cron SIP job
backend/db/apply_migration_012.py   → payout_date on user_profiles + investment_strategies
backend/db/apply_migration_013.py   → recommended_sip + required_sip_for_goal on investment_strategies
backend/db/migrations/014_investment_target_goal.sql  → target_goal on both tables (run via Supabase SQL editor)
```

### Key Files

| File | Role |
|------|------|
| `backend/api/investments.py` | Routes: GET /v1/investment/latest, POST /v1/investment/strategy, POST /v1/investment/parse-portfolio |
| `backend/services/investment_service.py` | Risk score, debt check, goal projection, budget SIP fetch, DB persistence, orchestration |
| `backend/services/ai_service.py` | `generate_investment_strategy_ai()` (accepts `budget_investment_allocation`, `payout_date`) + `parse_portfolio_from_text()` |
| `backend/schemas/investment_schema.py` | Pydantic models: `InvestmentStrategyResponse` (includes `recommended_sip`, `required_sip_for_goal`) |
| `backend/db/migrations/004_investment_strategies.sql` | Original DDL + RLS |
| `frontend/app/investments/page.tsx` | Full page: first-time setup, strategy view, SIP gap callout, override simulation |
| `frontend/lib/types/investment.ts` | TypeScript types (includes `recommended_sip`, `required_sip_for_goal`) |
| `frontend/app/api/investments/*/route.ts` | Next.js proxies for all 3 endpoints |
| `frontend/components/dashboard/metric-card.tsx` | MetricCard — now accepts optional `subtitle` prop |

---

## Assets & Net Worth Module

### Overview

Tracks user's physical and financial assets (real estate, vehicles, gold, equity, FD, gadgets) and liabilities (loans). AI provides real-time valuations and 5-year projections via Claude Sonnet on each drilldown.

### Key behaviours

- **Asset list value**: Uses `current_value` stored in `user_assets` DB row. Set by AI at add time and refreshed on every drilldown.
- **Drilldown value**: `GET /v1/assets/{asset_id}/drilldown` calls `ai_project_asset()` (Claude Sonnet) for a fresh estimate, then **immediately persists** `current_value` + `appreciation_rate` back to `user_assets` so list and drilldown always show the same number.
- **Frontend refresh**: When the drilldown sheet closes, `fetchData()` is called to reload the asset list with the newly persisted value.
- **Net worth**: Exact (sum of DB values) + AI approximate (Sonnet estimate) shown side by side.

### Key Files

| File | Role |
|------|------|
| `backend/routes/assets.py` | All asset/liability/networth routes; drilldown persists AI value back to DB |
| `backend/services/asset_service.py` | `add_asset`, `ai_project_asset`, `refresh_asset_value`, `get_asset_by_id` |
| `backend/services/networth_service.py` | `get_net_worth_summary`, `get_net_worth_timeline` |
| `frontend/app/assets/page.tsx` | Full page: list, drilldown sheet, add modal, net worth cards; refreshes on sheet close |
| `frontend/lib/types/asset.ts` | TypeScript types: `Asset`, `DrilldownData`, `NetWorthSummary` |

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