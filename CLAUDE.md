# FinSight AI — Claude Code Guide

---

## Loan Optimisation Engine (v2 — Advanced)

### Overview

The Loan Optimisation module computes optimal repayment strategies using deterministic
month-by-month amortization. AI is used ONLY for plain-language explanation — it never
performs calculations or overrides algorithmic results.

### Supported Strategies

#### Avalanche (Default)
- Sort loans by highest interest rate
- Minimises total interest paid over the loan lifetime

#### Snowball
- Sort loans by smallest outstanding principal
- Closes smallest loans first; improves psychological motivation

#### Hybrid
- AI-selected based on DTI ratio, number of loans, and user profile
- Not yet implemented — reserved for v3

### Core Simulation Rules
- MUST simulate month-by-month amortization — no approximations
- Minimum EMI constraint enforced on all loans every month
- Monthly surplus (income − all EMIs) allocated dynamically to priority loan
- When a loan closes, surplus cascades to next priority loan
- Simulation stops when all balances reach zero or 600 months (whichever first)

### Output Schema (STRICT)

```json
{
  "strategy_type": "avalanche | snowball",
  "total_interest_paid": 0,
  "months_to_close": 0,
  "total_payment": 0,
  "schedule": [
    {
      "month": 1,
      "loan_id": "uuid",
      "payment": 0,
      "interest": 0,
      "principal": 0,
      "remaining_balance": 0
    }
  ],
  "timeline": [
    { "year": 0, "total_balance": 0, "label": "Now" }
  ]
}
```

### AI Responsibilities

AI MAY:
- Explain why the chosen strategy is optimal
- Mention interest saved and time saved in concrete numbers
- Briefly address refinancing if highest rate > 12%
- Briefly address invest-vs-prepay if surplus > 2× EMIs and max rate < 10%

AI MUST NOT:
- Perform any calculations
- Override deterministic results
- Name specific lenders, stocks, mutual funds, or tax instruments
- Give tax advice

### Strategy Selection Logic

Default: Avalanche (minimises total interest).

Override conditions:
- If single loan: both strategies identical, report Avalanche
- If `avalanche.total_interest <= snowball.total_interest`: best = avalanche
- Otherwise: best = snowball

### Performance Constraints
- Maximum simulation: 600 months (50 years)
- Schedule returned to frontend: first 24 months only
- Full schedule stored in `loan_strategies.strategy_data.full_schedule` (JSONB)
- Yearly timeline aggregated for chart rendering

### Key Files

| File | Role |
|------|------|
| `backend/services/loan_optimizer.py` | Deterministic simulation — no AI, no DB |
| `backend/services/ai_service.py` | All Anthropic calls (Sonnet for reasoning) |
| `backend/services/context_builder.py` | Compact context assembly for AI prompts |
| `backend/routes/loans.py` | REST: GET /v1/loans, POST /v1/loans, POST /v1/loans/optimize |
| `backend/schemas/loan_schema.py` | Pydantic models |
| `backend/db/migrations/002_loans_tables.sql` | DDL for loans + loan_strategies with RLS |
| `frontend/app/loans/page.tsx` | Live loans page — real API, no hardcoded data |
| `frontend/app/api/loans/route.ts` | Next.js proxy → GET + POST /v1/loans |
| `frontend/app/api/loans/optimize/route.ts` | Next.js proxy → POST /v1/loans/optimize |
| `frontend/lib/types/loan.ts` | TypeScript types for all loan/optimizer shapes |

### DB Tables

**loans** — stores each user's active loans (principal, rate, EMI, tenure)
**loan_strategies** — stores optimization results with full JSONB schedule and AI rationale

Both tables have RLS with `user_isolation` policy. Run migration `002_loans_tables.sql` in Supabase SQL editor before using.
