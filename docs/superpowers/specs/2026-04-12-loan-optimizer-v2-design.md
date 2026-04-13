# Loan Optimisation Engine v2 — Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Scope:** Full-stack — backend service, API route, DB migration, frontend integration, CLAUDE.md update

---

## Overview

Implement a production-ready Loan Optimisation Engine that computes optimal debt repayment strategies (Avalanche and Snowball) using deterministic month-by-month amortization, stores results in Supabase, and generates AI explanations via Claude Sonnet. The frontend loans page is replaced from hardcoded data to a fully live, database-backed feature.

AI is used **only** for plain-language explanation — all calculations are deterministic.

---

## Architecture

### New Backend Files

| File | Role |
|------|------|
| `backend/services/ai_service.py` | Single Anthropic entry point. Sonnet for reasoning, Haiku for classification. No direct Anthropic calls outside this file. |
| `backend/services/context_builder.py` | Assembles compact user context (profile + loans) for AI prompts. Target < 1200 tokens. |
| `backend/services/loan_optimizer.py` | Pure deterministic simulation engine. Avalanche + Snowball strategies. No AI calls. |
| `backend/routes/loans.py` | REST endpoints: GET /v1/loans, POST /v1/loans, POST /v1/loans/optimize |
| `backend/schemas/loan_schema.py` | Pydantic models: LoanCreate, LoanResponse, OptimizeResponse |
| `backend/db/migrations/002_loans_tables.sql` | Creates `loans` + `loan_strategies` with RLS policies |

### Modified Backend Files

| File | Change |
|------|--------|
| `backend/main.py` | Include loans router |

### New Frontend Files

| File | Role |
|------|------|
| `frontend/app/api/loans/route.ts` | Proxy: GET /v1/loans, POST /v1/loans |
| `frontend/app/api/loans/optimize/route.ts` | Proxy: POST /v1/loans/optimize |

### Modified Frontend Files

| File | Change |
|------|--------|
| `frontend/app/loans/page.tsx` | Replace hardcoded data with real API + optimize UI |

### CLAUDE.md

Append "Loan Optimisation Engine (v2 — Advanced)" section.

---

## Database Schema

### loans table
```sql
CREATE TABLE loans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type             TEXT NOT NULL,
  lender                TEXT,
  principal_outstanding NUMERIC(15,2) NOT NULL,
  interest_rate         NUMERIC(5,2) NOT NULL,
  emi_amount            NUMERIC(12,2) NOT NULL,
  emis_remaining        SMALLINT NOT NULL,
  tenure_months         SMALLINT,
  down_payment          NUMERIC(12,2) DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### loan_strategies table
```sql
CREATE TABLE loan_strategies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type TEXT CHECK (strategy_type IN ('avalanche','snowball','hybrid','refinance')),
  strategy_data JSONB NOT NULL,
  ai_rationale  TEXT,
  total_saved   NUMERIC(15,2),
  months_saved  SMALLINT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loan_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loan_strategies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## API Endpoints

### GET /v1/loans
Returns all active loans for the authenticated user.

**Response:**
```json
{ "loans": [ { "id": "uuid", "loan_type": "...", "principal_outstanding": 0, "interest_rate": 0, "emi_amount": 0, "emis_remaining": 0 } ] }
```

### POST /v1/loans
Create a new loan record.

**Request body (LoanCreate):**
```json
{ "loan_type": "string", "lender": "string|null", "principal_outstanding": 0, "interest_rate": 0, "emi_amount": 0, "emis_remaining": 0, "tenure_months": 0 }
```

### POST /v1/loans/optimize
Run optimizer on all active loans for the user.

**Flow:**
1. Fetch active loans from DB
2. Fetch profile (monthly_income) from user_profiles
3. Compute monthly_surplus = income − sum(all EMIs). If ≤ 0, surplus = 0.
4. Run avalanche simulation
5. Run snowball simulation
6. Compare: best = lower total_interest_paid
7. Build context via context_builder.py
8. Call ai_service.py (Sonnet) for plain-language explanation
9. Deactivate old loan_strategies rows for this user
10. Insert new loan_strategies row (best strategy)
11. Return full comparison

**Response (OptimizeResponse):**
```json
{
  "best_strategy": "avalanche|snowball",
  "comparison": {
    "avalanche": {
      "strategy_type": "avalanche",
      "total_interest_paid": 0,
      "months_to_close": 0,
      "total_payment": 0,
      "schedule": [ { "month": 1, "loan_id": "uuid", "payment": 0, "interest": 0, "principal": 0, "remaining_balance": 0 } ]
    },
    "snowball": { "..." : "..." }
  },
  "total_saved": 0,
  "months_saved": 0,
  "ai_explanation": "string"
}
```

---

## Simulation Engine (loan_optimizer.py)

### Avalanche
- Sort loans by `interest_rate` descending
- Each month: pay minimum EMI on all active loans
- Allocate `surplus` to highest-rate loan until it closes, then cascade to next
- Track per-loan: payment, interest, principal_paid, remaining_balance
- Stop when all balances reach 0 or month > 600

### Snowball
- Same as avalanche but sort by `principal_outstanding` ascending

### Output per strategy
```python
{
    "strategy_type": "avalanche",
    "total_interest_paid": float,
    "months_to_close": int,
    "total_payment": float,
    "schedule": [ScheduleEntry, ...]   # full schedule stored in DB, first 24m returned to frontend
}
```

### Monthly surplus edge case
If `monthly_income - sum(all_emis) <= 0`: run simulation with surplus=0 (minimum payments only). Both strategies will be identical in this case.

---

## AI Service (ai_service.py)

**Model:** `claude-sonnet-4-20250514`

**Prompt inputs:**
- Best strategy type
- Total interest saved vs alternative
- Months saved
- Highest loan rate (refinance signal: rate > 12%)
- Monthly surplus vs total EMI ratio (invest-vs-prepay signal: surplus > 2x EMIs and max rate < 10%)

**Output:** Plain-language string (3–4 paragraphs). Stored in `loan_strategies.ai_rationale`.

**Rules (from AGENTS.md):**
- No specific stock/fund/lender names
- No tax advice
- Graceful degradation: if AI call fails, return empty string — do not crash the optimize endpoint

---

## Context Builder (context_builder.py)

Builds compact JSON context for AI calls. For the loans module:
```python
{
  "profile": { "income": 0, "currency": "INR", "housing_status": "...", "num_dependents": 0 },
  "loans": [ { "type": "...", "balance": 0, "rate": 0, "emi": 0 } ]
}
```
Target < 1200 tokens total. Never pass raw rows — summarise.

---

## Frontend (loans/page.tsx)

### State
```typescript
loans: LoanResponse[]          // from GET /api/loans
optimizeResult: OptimizeResult | null
isOptimizing: boolean
isAddingLoan: boolean
addLoanError: string | null
```

### Behaviour
- On mount: fetch loans from `GET /api/loans` using Supabase session token
- Empty state: if `loans.length === 0`, show prompt card "Add your first loan to get started"
- Add Loan form submits to `POST /api/loans`, then re-fetches loan list
- Optimize button: disabled if `loans.length === 0`. Calls `POST /api/loans/optimize`.
- Results section (renders after optimize):
  - Best strategy badge
  - Interest saved / months saved metric cards
  - AI explanation text block
  - Recharts LineChart comparing current trajectory vs optimized trajectory (data from schedule)
- `LoanCards` and `LoanTimeline` components reused

### Auth
Reads Supabase session from `@/lib/auth` to get Bearer token for API calls.

---

## CLAUDE.md Addition

Section: **"Loan Optimisation Engine (v2 — Advanced)"**

Covers: overview, strategies (avalanche/snowball/hybrid), simulation rules, output schema, AI responsibilities, strategy selection logic, performance constraints (600-month cap).

---

## Files Not Touched

- `backend/services/ai_categorizer.py` — existing expense categorization, unchanged
- `backend/services/expense_service.py` — unchanged
- All other frontend pages — unchanged
