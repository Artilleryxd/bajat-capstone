# Loan Optimisation Engine v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full-stack Loan Optimisation Engine with avalanche/snowball simulation, AI explanation via Claude Sonnet, live DB-backed frontend, and CLAUDE.md documentation.

**Architecture:** Deterministic month-by-month amortization runs in `loan_optimizer.py` (no AI). Claude Sonnet generates plain-language explanation via `ai_service.py` after calculations complete. Results stored in `loan_strategies` Supabase table with RLS. Frontend replaces all hardcoded data with real API calls.

**Tech Stack:** FastAPI + Pydantic v2, Supabase Python client, Anthropic Python SDK, Next.js 14 App Router, TypeScript, Recharts, shadcn/ui, `getToken()` from `@/lib/auth` for bearer tokens.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `backend/db/migrations/002_loans_tables.sql` | DDL for `loans` + `loan_strategies` with RLS |
| Create | `backend/schemas/loan_schema.py` | Pydantic models: LoanCreate, LoanResponse, OptimizeResponse |
| Create | `backend/services/loan_optimizer.py` | Pure deterministic simulation — no DB, no AI |
| Create | `backend/services/ai_service.py` | Single Anthropic entry point (Sonnet for reasoning) |
| Create | `backend/services/context_builder.py` | Compact context assembly for AI prompts |
| Create | `backend/routes/loans.py` | GET /v1/loans, POST /v1/loans, POST /v1/loans/optimize |
| Modify | `backend/main.py` | Include loans router |
| Create | `tests/conftest.py` | sys.path setup for backend imports |
| Create | `tests/test_loan_optimizer.py` | Unit tests for simulation engine |
| Create | `frontend/lib/types/loan.ts` | TypeScript types for loans + optimizer response |
| Create | `frontend/app/api/loans/route.ts` | Next.js proxy → GET + POST /v1/loans |
| Create | `frontend/app/api/loans/optimize/route.ts` | Next.js proxy → POST /v1/loans/optimize |
| Modify | `frontend/app/loans/page.tsx` | Replace hardcoded data; add optimize flow |
| Modify | `CLAUDE.md` | Append Loan Optimisation Engine v2 section |

---

## Task 1: DB Migration

**Files:**
- Create: `backend/db/migrations/002_loans_tables.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- backend/db/migrations/002_loans_tables.sql

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
CREATE POLICY "user_isolation" ON loans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_loans_user_active ON loans(user_id, is_active);

CREATE TABLE loan_strategies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type  TEXT CHECK (strategy_type IN ('avalanche','snowball','hybrid','refinance')),
  strategy_data  JSONB NOT NULL,
  ai_rationale   TEXT,
  total_saved    NUMERIC(15,2),
  months_saved   SMALLINT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loan_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loan_strategies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_loan_strategies_user ON loan_strategies(user_id, is_active, created_at DESC);
```

- [ ] **Step 2: Run in Supabase SQL editor**

Open your Supabase project dashboard → SQL Editor → paste the contents of `002_loans_tables.sql` → Run.

Verify: both tables appear in Table Editor with RLS enabled (shield icon).

- [ ] **Step 3: Commit**

```bash
git add backend/db/migrations/002_loans_tables.sql
git commit -m "feat: add loans and loan_strategies tables with RLS"
```

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `backend/schemas/loan_schema.py`

- [ ] **Step 1: Create the schema file**

```python
# backend/schemas/loan_schema.py
from pydantic import BaseModel, Field
from typing import Optional, Literal


class LoanCreate(BaseModel):
    loan_type: str
    lender: Optional[str] = None
    principal_outstanding: float = Field(gt=0)
    interest_rate: float = Field(gt=0, le=100)
    emi_amount: float = Field(gt=0)
    emis_remaining: int = Field(gt=0)
    tenure_months: Optional[int] = None


class LoanResponse(BaseModel):
    id: str
    loan_type: str
    lender: Optional[str] = None
    principal_outstanding: float
    interest_rate: float
    emi_amount: float
    emis_remaining: int
    tenure_months: Optional[int] = None
    is_active: bool


class ScheduleEntry(BaseModel):
    month: int
    loan_id: str
    payment: float
    interest: float
    principal: float
    remaining_balance: float


class TimelineEntry(BaseModel):
    year: int
    total_balance: float
    label: str


class StrategyResult(BaseModel):
    strategy_type: str
    total_interest_paid: float
    months_to_close: int
    total_payment: float
    schedule: list[ScheduleEntry]
    timeline: list[TimelineEntry]


class OptimizeResponse(BaseModel):
    best_strategy: Literal["avalanche", "snowball"]
    comparison: dict[str, StrategyResult]
    total_saved: float
    months_saved: int
    ai_explanation: str
```

- [ ] **Step 2: Commit**

```bash
git add backend/schemas/loan_schema.py
git commit -m "feat: add loan Pydantic schemas"
```

---

## Task 3: Loan Optimizer Service (TDD)

**Files:**
- Create: `backend/services/loan_optimizer.py`
- Create: `tests/conftest.py`
- Create: `tests/test_loan_optimizer.py`

- [ ] **Step 1: Set up test infrastructure**

```bash
cd /Users/adityasinghchauhan/Desktop/capstone/backend
pip install pytest
```

Create `tests/conftest.py`:

```python
# backend/tests/conftest.py
import sys
import os

# Allow imports from backend/ root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
```

Create `tests/__init__.py` (empty file):

```bash
touch backend/tests/__init__.py
```

- [ ] **Step 2: Write the failing tests**

```python
# backend/tests/test_loan_optimizer.py
import pytest
from services.loan_optimizer import Loan, optimize_loans


def make_loan(id: str, principal: float, rate: float, emi: float) -> Loan:
    return Loan(id=id, principal_outstanding=principal, interest_rate=rate, emi_amount=emi)


class TestAvalancheStrategy:
    def test_targets_highest_rate_first(self):
        """Avalanche should close higher-rate loan before lower-rate loan."""
        loans = [
            make_loan("low_rate",  5000, 5.0,  100),
            make_loan("high_rate", 5000, 20.0, 100),
        ]
        result = optimize_loans(loans, monthly_surplus=1000, monthly_income=1200)
        avalanche = result["comparison"]["avalanche"]

        # Find which loan hits 0 balance first
        first_closed_id = None
        for entry in avalanche["schedule"]:
            if entry["remaining_balance"] == 0:
                first_closed_id = entry["loan_id"]
                break

        assert first_closed_id == "high_rate"

    def test_lower_total_interest_than_snowball_with_rate_disparity(self):
        """When rates differ significantly, avalanche saves more interest."""
        loans = [
            make_loan("cheap", 1000, 3.0,  60),
            make_loan("dear",  1000, 24.0, 60),
        ]
        result = optimize_loans(loans, monthly_surplus=500, monthly_income=620)
        av_interest = result["comparison"]["avalanche"]["total_interest_paid"]
        sn_interest = result["comparison"]["snowball"]["total_interest_paid"]
        assert av_interest <= sn_interest


class TestSnowballStrategy:
    def test_closes_smallest_balance_first(self):
        """Snowball should close the smallest-balance loan first."""
        loans = [
            make_loan("small",  500,   5.0, 60),
            make_loan("large", 5000,   3.0, 100),
        ]
        result = optimize_loans(loans, monthly_surplus=400, monthly_income=560)
        schedule = result["comparison"]["snowball"]["schedule"]

        first_closed_id = None
        for entry in schedule:
            if entry["remaining_balance"] == 0:
                first_closed_id = entry["loan_id"]
                break

        assert first_closed_id == "small"


class TestEdgeCases:
    def test_single_loan_both_strategies_identical(self):
        """With one loan there is nothing to sort — results must be equal."""
        loans = [make_loan("only", 5000, 12.0, 200)]
        result = optimize_loans(loans, monthly_surplus=800, monthly_income=1000)
        av = result["comparison"]["avalanche"]
        sn = result["comparison"]["snowball"]
        assert av["total_interest_paid"] == sn["total_interest_paid"]
        assert av["months_to_close"] == sn["months_to_close"]

    def test_zero_surplus_both_strategies_identical(self):
        """When income just covers EMIs, both strategies are minimum-payment only."""
        loans = [
            make_loan("a", 3000, 10.0, 150),
            make_loan("b", 2000,  8.0, 100),
        ]
        # income exactly equals total EMI → surplus = 0
        result = optimize_loans(loans, monthly_surplus=250, monthly_income=250)
        av = result["comparison"]["avalanche"]
        sn = result["comparison"]["snowball"]
        assert av["total_interest_paid"] == sn["total_interest_paid"]

    def test_simulation_terminates(self):
        """Simulation must not run past 600 months."""
        loans = [make_loan("x", 100000, 0.1, 10)]  # near-zero rate, tiny EMI
        result = optimize_loans(loans, monthly_surplus=10, monthly_income=20)
        av = result["comparison"]["avalanche"]
        assert av["months_to_close"] <= 600

    def test_no_loans_raises(self):
        with pytest.raises(ValueError, match="No loans"):
            optimize_loans([], monthly_surplus=1000, monthly_income=1000)


class TestOutputSchema:
    def test_required_keys_present(self):
        loans = [make_loan("x", 3000, 10.0, 150)]
        result = optimize_loans(loans, monthly_surplus=1000, monthly_income=1150)

        assert "best_strategy" in result
        assert result["best_strategy"] in ("avalanche", "snowball")
        assert "comparison" in result
        assert "avalanche" in result["comparison"]
        assert "snowball" in result["comparison"]
        assert "total_saved" in result
        assert "months_saved" in result

    def test_strategy_result_keys(self):
        loans = [make_loan("x", 3000, 10.0, 150)]
        result = optimize_loans(loans, monthly_surplus=1000, monthly_income=1150)

        for strat in result["comparison"].values():
            assert "strategy_type" in strat
            assert "total_interest_paid" in strat
            assert "months_to_close" in strat
            assert "total_payment" in strat
            assert "schedule" in strat
            assert "timeline" in strat

    def test_schedule_entry_keys(self):
        loans = [make_loan("x", 3000, 10.0, 150)]
        result = optimize_loans(loans, monthly_surplus=1000, monthly_income=1150)
        entry = result["comparison"]["avalanche"]["schedule"][0]
        for key in ("month", "loan_id", "payment", "interest", "principal", "remaining_balance"):
            assert key in entry

    def test_best_strategy_matches_lower_interest(self):
        loans = [
            make_loan("cheap", 1000, 3.0,  60),
            make_loan("dear",  1000, 24.0, 60),
        ]
        result = optimize_loans(loans, monthly_surplus=500, monthly_income=620)
        best = result["best_strategy"]
        best_interest = result["comparison"][best]["total_interest_paid"]
        other = "snowball" if best == "avalanche" else "avalanche"
        other_interest = result["comparison"][other]["total_interest_paid"]
        assert best_interest <= other_interest
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd /Users/adityasinghchauhan/Desktop/capstone/backend
python -m pytest tests/test_loan_optimizer.py -v 2>&1 | head -30
```

Expected: `ImportError` or `ModuleNotFoundError` — `loan_optimizer` does not exist yet.

- [ ] **Step 4: Implement loan_optimizer.py**

```python
# backend/services/loan_optimizer.py
"""
Deterministic loan repayment simulator.
Supports Avalanche (highest rate first) and Snowball (smallest balance first).
No AI calls. No DB calls. Pure computation only.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

MAX_MONTHS = 600  # 50-year safety cap


@dataclass
class Loan:
    id: str
    principal_outstanding: float
    interest_rate: float   # annual percentage, e.g. 12.5
    emi_amount: float      # minimum monthly payment


def _simulate(loans: list[Loan], surplus: float, strategy: str) -> dict:
    """
    Run month-by-month amortization.

    surplus: monthly_income - sum(all EMIs). May be 0 if income can't exceed EMIs.
    strategy: 'avalanche' | 'snowball'

    Returns a dict with strategy_type, total_interest_paid, months_to_close,
    total_payment, schedule (full), timeline (yearly aggregated).
    """
    if strategy == "avalanche":
        sorted_loans = sorted(loans, key=lambda l: l.interest_rate, reverse=True)
    else:
        sorted_loans = sorted(loans, key=lambda l: l.principal_outstanding)

    balances: dict[str, float] = {l.id: float(l.principal_outstanding) for l in sorted_loans}
    schedule: list[dict] = []
    total_interest = 0.0
    total_payment = 0.0
    months_to_close = 0

    for month in range(1, MAX_MONTHS + 1):
        active = [l for l in sorted_loans if balances[l.id] > 0.005]
        if not active:
            break

        min_emi_total = sum(l.emi_amount for l in active)
        # Extra money beyond minimum EMIs, cascades through priority order
        remaining_extra = max(0.0, surplus - min_emi_total)

        for loan in active:
            monthly_rate = loan.interest_rate / 100.0 / 12.0
            interest = round(balances[loan.id] * monthly_rate, 2)

            # First-priority loan gets all available extra
            payment = loan.emi_amount + remaining_extra
            remaining_extra = 0.0

            # Never overpay beyond closing the loan
            max_payable = round(balances[loan.id] + interest, 2)
            if payment >= max_payable:
                remaining_extra = round(payment - max_payable, 2)
                payment = max_payable

            principal_paid = round(payment - interest, 2)
            balances[loan.id] = round(max(0.0, balances[loan.id] - principal_paid), 6)

            total_interest += interest
            total_payment += payment

            schedule.append({
                "month": month,
                "loan_id": loan.id,
                "payment": round(payment, 2),
                "interest": interest,
                "principal": principal_paid,
                "remaining_balance": round(balances[loan.id], 2),
            })

        months_to_close = month

    # Build yearly timeline for chart (aggregates total balance at year boundaries)
    timeline: list[dict] = []
    initial_total = sum(l.principal_outstanding for l in loans)
    timeline.append({"year": 0, "total_balance": round(initial_total, 2), "label": "Now"})

    year = 1
    while year * 12 <= months_to_close:
        month_num = year * 12
        # Get latest balance per loan at or before month_num
        by_loan: dict[str, float] = {}
        for entry in schedule:
            if entry["month"] <= month_num:
                by_loan[entry["loan_id"]] = entry["remaining_balance"]
        total_bal = round(sum(by_loan.values()), 2)
        timeline.append({"year": year, "total_balance": total_bal, "label": f"Y{year}"})
        if total_bal == 0.0:
            break
        year += 1

    return {
        "strategy_type": strategy,
        "total_interest_paid": round(total_interest, 2),
        "months_to_close": months_to_close,
        "total_payment": round(total_payment, 2),
        "schedule": schedule,          # full schedule (route handler trims for response)
        "timeline": timeline,
    }


def optimize_loans(
    loans: list[Loan],
    monthly_surplus: float,
    monthly_income: float,  # noqa: ARG001 — reserved for future invest-vs-prepay logic
) -> dict:
    """
    Run avalanche and snowball simulations and return comparison dict.

    monthly_surplus should be pre-computed as monthly_income - sum(all EMIs).
    If <= 0, simulations run with zero extra (minimum payments only).
    """
    if not loans:
        raise ValueError("No loans to optimize")

    surplus = max(0.0, monthly_surplus)

    avalanche = _simulate(loans, surplus, "avalanche")
    snowball = _simulate(loans, surplus, "snowball")

    # Baseline: minimum payments only — used to calculate total_saved / months_saved
    baseline = _simulate(loans, 0.0, "avalanche")

    best = (
        "avalanche"
        if avalanche["total_interest_paid"] <= snowball["total_interest_paid"]
        else "snowball"
    )
    best_result = avalanche if best == "avalanche" else snowball

    total_saved = round(baseline["total_interest_paid"] - best_result["total_interest_paid"], 2)
    months_saved = baseline["months_to_close"] - best_result["months_to_close"]

    def trimmed(result: dict) -> dict:
        """Return strategy dict with schedule limited to first 24 months for API response."""
        return {**result, "schedule": result["schedule"][:24]}

    return {
        "best_strategy": best,
        "comparison": {
            "avalanche": trimmed(avalanche),
            "snowball": trimmed(snowball),
        },
        # Full schedules kept for DB storage — not sent to frontend
        "_full_schedules": {
            "avalanche": avalanche["schedule"],
            "snowball": snowball["schedule"],
        },
        "total_saved": total_saved,
        "months_saved": months_saved,
    }
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
cd /Users/adityasinghchauhan/Desktop/capstone/backend
python -m pytest tests/test_loan_optimizer.py -v
```

Expected output: all tests marked `PASSED`. Zero failures.

- [ ] **Step 6: Commit**

```bash
git add backend/services/loan_optimizer.py backend/tests/
git commit -m "feat: add loan optimizer simulation engine with tests"
```

---

## Task 4: AI Service

**Files:**
- Create: `backend/services/ai_service.py`

- [ ] **Step 1: Create ai_service.py**

```python
# backend/services/ai_service.py
"""
Single entry point for all Anthropic API calls in FinSight.
- Use SONNET_MODEL for reasoning tasks (loan optimization, budget planning, chat).
- Use HAIKU_MODEL for classification tasks (expense categorization, column mapping).
Never call anthropic.Anthropic() outside this file.
"""
import logging
import os
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-20250514"
HAIKU_MODEL = "claude-haiku-4-5-20251001"


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)


def generate_loan_explanation(
    best_strategy: str,
    total_saved: float,
    months_saved: int,
    highest_rate: float,
    monthly_surplus: float,
    total_emi: float,
    currency: str = "INR",
) -> Optional[str]:
    """
    Generate a plain-language explanation of the chosen loan repayment strategy.

    Returns None on failure — callers must handle graceful degradation.
    Never raises; exceptions are caught and logged.
    """
    invest_signal = monthly_surplus > (total_emi * 2) and highest_rate < 10.0
    refinance_signal = highest_rate > 12.0

    prompt = f"""You are FinSight, a personal finance advisor. Explain the following loan repayment strategy recommendation in 3–4 concise paragraphs.

Strategy chosen: {best_strategy}
Interest saved vs minimum payments: {currency} {total_saved:,.2f}
Months saved: {months_saved}
Highest loan interest rate: {highest_rate:.2f}%
Monthly surplus after all EMIs: {currency} {monthly_surplus:,.2f}
{("Note: The user has a large monthly surplus and relatively low loan rates. Briefly address whether allocating some surplus to investments might be worth considering (without naming specific instruments)." if invest_signal else "")}
{("Note: The highest interest rate exceeds 12%. Briefly mention that refinancing at a lower rate could reduce costs, without naming specific lenders." if refinance_signal else "")}

RULES:
- NEVER name specific stocks, mutual funds, ETFs, lenders, or tax instruments
- NEVER give tax advice
- Explain clearly why this strategy was chosen over the alternative
- Mention the interest and time savings in concrete numbers
- Be encouraging and plain-language — no jargon
- Maximum 4 paragraphs"""

    try:
        client = _get_client()
        response = client.messages.create(
            model=SONNET_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error("AI loan explanation failed: %s", e)
        return None
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/ai_service.py
git commit -m "feat: add ai_service.py as single Anthropic entry point"
```

---

## Task 5: Context Builder

**Files:**
- Create: `backend/services/context_builder.py`

- [ ] **Step 1: Create context_builder.py**

```python
# backend/services/context_builder.py
"""
Assembles compact user context for AI prompts.
Target: < 1200 tokens per context payload.
Never pass raw DB rows — always summarise.
"""
import logging

logger = logging.getLogger(__name__)


def build_loan_context(profile: dict, loans: list[dict]) -> dict:
    """
    Build compact context for loan-module AI calls.

    profile: row from user_profiles table
    loans:   rows from loans table (active loans only)
    """
    return {
        "profile": {
            "income": float(profile.get("monthly_income") or 0),
            "currency": profile.get("currency", "INR"),
            "housing_status": profile.get("housing_status"),
            "num_dependents": int(profile.get("num_dependents") or 0),
        },
        "loans": [
            {
                "type": row.get("loan_type"),
                "balance": float(row.get("principal_outstanding") or 0),
                "rate": float(row.get("interest_rate") or 0),
                "emi": float(row.get("emi_amount") or 0),
            }
            for row in loans
        ],
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/context_builder.py
git commit -m "feat: add context_builder.py for AI context assembly"
```

---

## Task 6: Loans Route

**Files:**
- Create: `backend/routes/loans.py`

- [ ] **Step 1: Create the route file**

```python
# backend/routes/loans.py
"""Loan CRUD and optimisation endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException

from db.supabase_client import supabase
from schemas.loan_schema import LoanCreate
from services.loan_optimizer import Loan, optimize_loans
from services.ai_service import generate_loan_explanation
from utils.jwt_verifier import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/loans", tags=["loans"])


@router.get("")
def get_loans(user: dict = Depends(get_current_user)):
    """Return all active loans for the authenticated user."""
    try:
        res = (
            supabase.table("loans")
            .select("*")
            .eq("user_id", user["id"])
            .eq("is_active", True)
            .execute()
        )
        return {"loans": res.data or []}
    except Exception as e:
        logger.error("Fetch loans failed for user %s: %s", user["id"], e)
        raise HTTPException(
            status_code=500,
            detail={"code": "FETCH_FAILED", "message": "Failed to fetch loans"},
        )


@router.post("")
def create_loan(body: LoanCreate, user: dict = Depends(get_current_user)):
    """Create a new loan record for the authenticated user."""
    try:
        data = body.model_dump()
        data["user_id"] = user["id"]
        res = supabase.table("loans").insert(data).execute()
        if not res.data:
            raise Exception("Insert returned no data")
        return {"loan": res.data[0]}
    except Exception as e:
        logger.error("Create loan failed for user %s: %s", user["id"], e)
        raise HTTPException(
            status_code=500,
            detail={"code": "CREATE_FAILED", "message": "Failed to create loan"},
        )


@router.post("/optimize")
def optimize_user_loans(user: dict = Depends(get_current_user)):
    """
    Run avalanche + snowball simulations on all active loans.
    Stores best strategy in loan_strategies, returns full comparison + AI explanation.
    """
    try:
        # 1. Fetch active loans
        loans_res = (
            supabase.table("loans")
            .select("*")
            .eq("user_id", user["id"])
            .eq("is_active", True)
            .execute()
        )
        loan_rows = loans_res.data or []

        if not loan_rows:
            raise HTTPException(
                status_code=400,
                detail={"code": "NO_LOANS", "message": "No active loans found. Add loans first."},
            )

        # 2. Fetch profile for income + currency
        profile_res = (
            supabase.table("user_profiles")
            .select("monthly_income,currency,housing_status,num_dependents")
            .eq("id", user["id"])
            .execute()
        )
        profile = profile_res.data[0] if profile_res.data else {}
        monthly_income = float(profile.get("monthly_income") or 0)
        currency = profile.get("currency", "INR")

        # 3. Build Loan objects for optimizer
        loans = [
            Loan(
                id=row["id"],
                principal_outstanding=float(row["principal_outstanding"]),
                interest_rate=float(row["interest_rate"]),
                emi_amount=float(row["emi_amount"]),
            )
            for row in loan_rows
        ]

        total_emi = sum(l.emi_amount for l in loans)
        monthly_surplus = monthly_income - total_emi

        # 4. Run deterministic optimization
        result = optimize_loans(
            loans,
            monthly_surplus=monthly_surplus,
            monthly_income=monthly_income,
        )

        # 5. Generate AI explanation (graceful degradation on failure)
        highest_rate = max(l.interest_rate for l in loans)
        ai_explanation = generate_loan_explanation(
            best_strategy=result["best_strategy"],
            total_saved=result["total_saved"],
            months_saved=result["months_saved"],
            highest_rate=highest_rate,
            monthly_surplus=max(0.0, monthly_surplus),
            total_emi=total_emi,
            currency=currency,
        ) or ""

        # 6. Deactivate previous strategies, insert new one
        supabase.table("loan_strategies").update({"is_active": False}).eq(
            "user_id", user["id"]
        ).execute()

        best_key = result["best_strategy"]
        best_full_schedule = result["_full_schedules"][best_key]
        best_comparison = result["comparison"][best_key]

        supabase.table("loan_strategies").insert(
            {
                "user_id": user["id"],
                "strategy_type": best_key,
                "strategy_data": {
                    "schedule_24m": best_comparison["schedule"],
                    "full_schedule": best_full_schedule,
                    "total_months": best_comparison["months_to_close"],
                    "total_interest": best_comparison["total_interest_paid"],
                    "timeline": best_comparison["timeline"],
                    "loans_snapshot": [
                        {
                            "id": l.id,
                            "principal": l.principal_outstanding,
                            "rate": l.interest_rate,
                            "emi": l.emi_amount,
                        }
                        for l in loans
                    ],
                },
                "ai_rationale": ai_explanation,
                "total_saved": result["total_saved"],
                "months_saved": result["months_saved"],
                "is_active": True,
            }
        ).execute()

        return {
            "best_strategy": result["best_strategy"],
            "comparison": result["comparison"],
            "total_saved": result["total_saved"],
            "months_saved": result["months_saved"],
            "ai_explanation": ai_explanation,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Loan optimization failed for user %s: %s", user["id"], e)
        raise HTTPException(
            status_code=500,
            detail={"code": "OPTIMIZE_FAILED", "message": "Optimization failed. Please try again."},
        )
```

- [ ] **Step 2: Commit**

```bash
git add backend/routes/loans.py
git commit -m "feat: add loans route with GET, POST, and POST /optimize endpoints"
```

---

## Task 7: Register Router

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Read the current main.py to confirm import line**

Current content (already known):
```python
from routes import auth, profile, expenses
```

- [ ] **Step 2: Add loans router import and registration**

In `backend/main.py`, change:
```python
from routes import auth, profile, expenses
```
to:
```python
from routes import auth, profile, expenses, loans
```

And after `app.include_router(expenses.router)`, add:
```python
app.include_router(loans.router)
```

- [ ] **Step 3: Verify the server starts without errors**

```bash
cd /Users/adityasinghchauhan/Desktop/capstone/backend
uvicorn main:app --reload --port 8000
```

Expected: server starts, no import errors. Visit `http://localhost:8000/docs` and confirm `/v1/loans`, `/v1/loans/optimize` routes appear.

- [ ] **Step 4: Commit**

```bash
git add backend/main.py
git commit -m "feat: register loans router in FastAPI app"
```

---

## Task 8: Frontend TypeScript Types

**Files:**
- Create: `frontend/lib/types/loan.ts`

- [ ] **Step 1: Create the types file**

```typescript
// frontend/lib/types/loan.ts

export interface LoanResponse {
  id: string
  loan_type: string
  lender: string | null
  principal_outstanding: number
  interest_rate: number
  emi_amount: number
  emis_remaining: number
  tenure_months: number | null
  is_active: boolean
}

export interface LoanCreate {
  loan_type: string
  lender?: string
  principal_outstanding: number
  interest_rate: number
  emi_amount: number
  emis_remaining: number
  tenure_months?: number
}

export interface ScheduleEntry {
  month: number
  loan_id: string
  payment: number
  interest: number
  principal: number
  remaining_balance: number
}

export interface TimelineEntry {
  year: number
  total_balance: number
  label: string
}

export interface StrategyResult {
  strategy_type: "avalanche" | "snowball"
  total_interest_paid: number
  months_to_close: number
  total_payment: number
  schedule: ScheduleEntry[]
  timeline: TimelineEntry[]
}

export interface OptimizeResult {
  best_strategy: "avalanche" | "snowball"
  comparison: {
    avalanche: StrategyResult
    snowball: StrategyResult
  }
  total_saved: number
  months_saved: number
  ai_explanation: string
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/types/loan.ts
git commit -m "feat: add TypeScript types for loans and optimizer response"
```

---

## Task 9: Frontend API Proxy Routes

**Files:**
- Create: `frontend/app/api/loans/route.ts`
- Create: `frontend/app/api/loans/optimize/route.ts`

- [ ] **Step 1: Create the loans proxy**

```typescript
// frontend/app/api/loans/route.ts
import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/config"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_BASE_URL}/v1/loans`, {
      headers: { Authorization: authHeader },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch loans"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const res = await fetch(`${API_BASE_URL}/v1/loans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create loan"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the optimize proxy**

```typescript
// frontend/app/api/loans/optimize/route.ts
import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/config"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_BASE_URL}/v1/loans/optimize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Optimization failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/loans/
git commit -m "feat: add Next.js proxy routes for loans and optimize"
```

---

## Task 10: Frontend Loans Page

**Files:**
- Modify: `frontend/app/loans/page.tsx`

- [ ] **Step 1: Replace loans/page.tsx with the live implementation**

```tsx
// frontend/app/loans/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoanCards } from "@/components/dashboard/loan-cards"
import { LoanTimeline } from "@/components/dashboard/loan-timeline"
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Plus,
  Zap,
  Snowflake,
  Calendar,
  DollarSign,
  TrendingDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrency } from "@/lib/hooks/useCurrency"
import { getToken } from "@/lib/auth"
import type { LoanResponse, LoanCreate, OptimizeResult } from "@/lib/types/loan"

const LOAN_TYPE_OPTIONS = [
  "Home Loan",
  "Car Loan",
  "Personal Loan",
  "Education Loan",
  "Credit Card",
  "Business Loan",
  "Gold Loan",
  "Other",
]

function loanToCardFormat(loan: LoanResponse) {
  const iconMap: Record<string, "home" | "car" | "credit-card" | "education" | "personal"> = {
    "Home Loan": "home",
    "Car Loan": "car",
    "Credit Card": "credit-card",
    "Education Loan": "education",
  }
  return {
    id: loan.id,
    type: loan.loan_type,
    icon: (iconMap[loan.loan_type] ?? "personal") as "home" | "car" | "credit-card" | "education" | "personal",
    balance: loan.principal_outstanding,
    originalAmount: loan.principal_outstanding,
    interestRate: loan.interest_rate,
    emi: loan.emi_amount,
    remainingMonths: loan.emis_remaining,
  }
}

export default function LoansPage() {
  const { formatCurrency, currencySymbol } = useCurrency()

  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAddingLoan, setIsAddingLoan] = useState(false)

  // Add loan form state
  const [loanType, setLoanType] = useState("")
  const [lender, setLender] = useState("")
  const [balance, setBalance] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [emi, setEmi] = useState("")
  const [emisRemaining, setEmisRemaining] = useState("")

  const fetchLoans = useCallback(async () => {
    setLoadingLoans(true)
    try {
      const token = getToken()
      const res = await fetch("/api/loans", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch loans")
      const data = await res.json()
      setLoans(data.loans ?? [])
    } catch {
      toast.error("Could not load loans")
    } finally {
      setLoadingLoans(false)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const handleAddLoan = async () => {
    if (!loanType || !balance || !interestRate || !emi || !emisRemaining) {
      toast.error("Please fill in all required fields")
      return
    }

    const payload: LoanCreate = {
      loan_type: loanType,
      lender: lender || undefined,
      principal_outstanding: parseFloat(balance),
      interest_rate: parseFloat(interestRate),
      emi_amount: parseFloat(emi),
      emis_remaining: parseInt(emisRemaining, 10),
    }

    setIsAddingLoan(true)
    try {
      const token = getToken()
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to add loan")
      toast.success("Loan added successfully")
      setLoanType("")
      setLender("")
      setBalance("")
      setInterestRate("")
      setEmi("")
      setEmisRemaining("")
      setShowAddForm(false)
      fetchLoans()
    } catch {
      toast.error("Failed to add loan")
    } finally {
      setIsAddingLoan(false)
    }
  }

  const handleOptimize = async () => {
    setIsOptimizing(true)
    try {
      const token = getToken()
      const res = await fetch("/api/loans/optimize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.detail?.message ?? "Optimization failed")
      }
      const data: OptimizeResult = await res.json()
      setOptimizeResult(data)
      toast.success("Optimization complete")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Optimization failed")
    } finally {
      setIsOptimizing(false)
    }
  }

  // Derived metrics
  const totalDebt = loans.reduce((s, l) => s + l.principal_outstanding, 0)
  const totalEmi = loans.reduce((s, l) => s + l.emi_amount, 0)

  // Build timeline data for LoanTimeline component
  const timelineData = optimizeResult
    ? optimizeResult.comparison[optimizeResult.best_strategy].timeline.map((t) => ({
        month: t.label,
        balance: t.total_balance,
        paid: totalDebt - t.total_balance,
      }))
    : loans.length > 0
    ? [{ month: "Now", balance: totalDebt, paid: 0 }]
    : []

  // Build comparison chart data (avalanche vs snowball timelines)
  const comparisonChartData =
    optimizeResult
      ? (() => {
          const avTimeline = optimizeResult.comparison.avalanche.timeline
          const snTimeline = optimizeResult.comparison.snowball.timeline
          const maxLen = Math.max(avTimeline.length, snTimeline.length)
          return Array.from({ length: maxLen }, (_, i) => ({
            label: avTimeline[i]?.label ?? snTimeline[i]?.label ?? `Y${i}`,
            avalanche: avTimeline[i]?.total_balance ?? 0,
            snowball: snTimeline[i]?.total_balance ?? 0,
          }))
        })()
      : []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Optimization</h1>
            <p className="text-muted-foreground">
              Optimize your debt repayment strategy with AI-powered recommendations
            </p>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={loans.length === 0 || isOptimizing}
            className="gap-2"
          >
            {isOptimizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isOptimizing ? "Analyzing..." : "Optimize"}
          </Button>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Debt"
            value={formatCurrency(totalDebt)}
            icon={DollarSign}
            iconColor="bg-chart-2/10 text-chart-2"
          />
          <MetricCard
            title="Monthly Payments"
            value={formatCurrency(totalEmi)}
            icon={Calendar}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Interest Saved"
            value={optimizeResult ? formatCurrency(optimizeResult.total_saved) : "—"}
            change={optimizeResult ? undefined : undefined}
            changeLabel={optimizeResult ? "with optimization" : "run optimize to see"}
            icon={TrendingDown}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Months Saved"
            value={optimizeResult ? `${optimizeResult.months_saved} months` : "—"}
            icon={Zap}
            iconColor="bg-chart-3/10 text-chart-3"
          />
        </div>

        {/* Optimization Results */}
        {optimizeResult && (
          <div className="space-y-4">
            {/* Best strategy banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="capitalize bg-primary text-primary-foreground">
                    {optimizeResult.best_strategy} — Recommended
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Saves {formatCurrency(optimizeResult.total_saved)} in interest
                    · {optimizeResult.months_saved} months faster
                  </span>
                </div>
              </CardHeader>
              {optimizeResult.ai_explanation && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {optimizeResult.ai_explanation}
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Strategy comparison */}
            <div className="grid gap-4 lg:grid-cols-2">
              {(["avalanche", "snowball"] as const).map((key) => {
                const strat = optimizeResult.comparison[key]
                const isBest = optimizeResult.best_strategy === key
                return (
                  <Card key={key} className={isBest ? "border-primary/30" : ""}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {key === "avalanche" ? (
                          <Zap className="w-4 h-4 text-chart-3" />
                        ) : (
                          <Snowflake className="w-4 h-4 text-chart-2" />
                        )}
                        {key.charAt(0).toUpperCase() + key.slice(1)} Method
                        {isBest && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            Best
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {key === "avalanche"
                          ? "Pay highest-rate loans first — minimises total interest"
                          : "Pay smallest loans first — builds momentum"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">Total Interest</span>
                        <span className="font-semibold">
                          {formatCurrency(strat.total_interest_paid)}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">Months to Close</span>
                        <span className="font-semibold">{strat.months_to_close}</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">Total Payment</span>
                        <span className="font-semibold">
                          {formatCurrency(strat.total_payment)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Comparison chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strategy Comparison</CardTitle>
                <CardDescription>
                  Total outstanding balance over time — Avalanche vs Snowball
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: number) =>
                          `${currencySymbol}${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avalanche"
                        name="Avalanche"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="snowball"
                        name="Snowball"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Your Loans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Loans</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" /> Hide Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Add Loan
                </>
              )}
            </Button>
          </div>

          {/* Add Loan Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Loan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-type">Loan Type *</Label>
                    <Select value={loanType} onValueChange={setLoanType}>
                      <SelectTrigger id="loan-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAN_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lender">Lender</Label>
                    <Input
                      id="lender"
                      placeholder="e.g. HDFC Bank"
                      value={lender}
                      onChange={(e) => setLender(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="balance">Outstanding Balance *</Label>
                    <Input
                      id="balance"
                      type="number"
                      min="0"
                      placeholder="e.g. 500000"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="interest-rate">Interest Rate (%) *</Label>
                    <Input
                      id="interest-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 8.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emi">Monthly EMI *</Label>
                    <Input
                      id="emi"
                      type="number"
                      min="0"
                      placeholder="e.g. 12000"
                      value={emi}
                      onChange={(e) => setEmi(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emis-remaining">EMIs Remaining *</Label>
                    <Input
                      id="emis-remaining"
                      type="number"
                      min="1"
                      placeholder="e.g. 48"
                      value={emisRemaining}
                      onChange={(e) => setEmisRemaining(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddLoan} disabled={isAddingLoan}>
                    {isAddingLoan ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isAddingLoan ? "Adding..." : "Add Loan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan Cards */}
          {loadingLoans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : loans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="font-medium">No loans added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your loans above to get personalized repayment recommendations
                </p>
              </CardContent>
            </Card>
          ) : (
            <LoanCards loans={loans.map(loanToCardFormat)} />
          )}
        </div>

        {/* Payoff Timeline */}
        {timelineData.length > 0 && (
          <LoanTimeline data={timelineData} />
        )}
      </div>
    </DashboardLayout>
  )
}
```

- [ ] **Step 2: Start the dev server and verify the page loads**

```bash
cd /Users/adityasinghchauhan/Desktop/capstone/frontend
pnpm dev
```

Open `http://localhost:3000/loans`. Verify:
- Page loads without TypeScript errors in the terminal
- "No loans added yet" empty state renders correctly
- Optimize button is disabled when no loans exist

- [ ] **Step 3: Test the Add Loan flow**

With the backend running on port 8000:
1. Click "Add Loan" → form expands
2. Fill in: Home Loan, HDFC, 500000, 8.5, 12000, 48
3. Click "Add Loan" → toast "Loan added successfully"
4. Form hides, LoanCards renders with the new loan

- [ ] **Step 4: Test the Optimize flow**

With at least one loan in the DB:
1. Click "Optimize" → button shows spinner + "Analyzing..."
2. After response: toast "Optimization complete"
3. Best strategy badge renders
4. Comparison cards show interest/months/total-payment for both strategies
5. Comparison line chart renders with two lines
6. AI explanation text appears (may be empty if ANTHROPIC_API_KEY not set — that is expected)
7. LoanTimeline updates with optimized schedule data

- [ ] **Step 5: Commit**

```bash
git add frontend/app/loans/page.tsx
git commit -m "feat: replace hardcoded loans page with live API and optimizer UI"
```

---

## Task 11: CLAUDE.md Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append the Loan Optimisation section to CLAUDE.md**

Open `CLAUDE.md` and append the following at the end of the file:

```markdown
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
- If avalanche.total_interest < snowball.total_interest: best = avalanche
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
| `frontend/app/loans/page.tsx` | Live loans page — real API, no hardcoded data |
| `frontend/lib/types/loan.ts` | TypeScript types for all loan/optimizer shapes |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Loan Optimisation Engine v2 section to CLAUDE.md"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec requirements mapped to tasks:
  - Avalanche strategy → Task 3
  - Snowball strategy → Task 3
  - Month-by-month amortization → Task 3
  - optimize_loans() return schema → Task 3
  - POST /v1/loans/optimize → Task 6
  - Fetch user loans from DB → Task 6
  - Fetch user profile → Task 6
  - Compute monthly surplus → Task 6
  - Store in loan_strategies → Task 6
  - AI explanation via Sonnet → Task 4, used in Task 6
  - RLS compliance → Task 1
  - Optimize button → Task 10
  - Best strategy badge → Task 10
  - Interest saved / months saved metrics → Task 10
  - AI explanation display → Task 10
  - Comparison line chart → Task 10
  - LoanCards reused → Task 10
  - CLAUDE.md update → Task 11

- [x] **No placeholders:** All steps have concrete code. No "TBD" or "implement later".

- [x] **Type consistency:**
  - `Loan` dataclass defined in Task 3, used in Task 6 ✓
  - `OptimizeResult` TypeScript type defined in Task 8, used in Task 10 ✓
  - `LoanResponse` defined in Task 8, used in Task 10 ✓
  - `_full_schedules` key in optimizer output, consumed in Task 6 route ✓
  - `timeline` field in strategy result, consumed in chart data in Task 10 ✓

- [x] **Edge cases handled:** Zero surplus, no loans (raises 400), single loan, simulate terminates at 600 months.
