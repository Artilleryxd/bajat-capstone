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