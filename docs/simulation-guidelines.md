# FinSight AI — Loan Simulation Engine Guidelines

## Supported Strategies

| Strategy | Sort Order | Goal |
|----------|-----------|------|
| **Avalanche** (default) | Highest interest rate first | Minimise total interest paid |
| **Snowball** | Smallest outstanding principal first | Close loans fastest; psychological motivation |
| **Hybrid** | AI-selected based on DTI, number of loans, user profile | ⚠️ Not yet implemented — reserved for future version |

## Simulation Rules (MUST follow exactly)

- Simulate **month-by-month amortization** — no approximations
- Enforce minimum EMI constraint on all loans every month
- `monthly_budget = max(sum_of_all_emis, monthly_income)`
- `extra = monthly_budget − sum(active_loan_emis)` — recalculated every month
- When a loan closes, its EMI frees up automatically (leaves active list; next month's extra grows)
- Priority loan (per strategy ordering) receives **all** extra each month
- If the priority loan closes mid-month, leftover cascades to the next priority loan
- Stop simulation when all balances reach zero **or** after 600 months, whichever comes first

## Baseline Calculation (for savings metrics)

The baseline represents doing nothing — each loan pays its own EMI independently with no reallocation when a loan closes.

| Metric | Formula |
|--------|---------|
| `total_saved` | baseline interest − best strategy interest |
| `months_saved` | baseline months − best strategy months |

This shows the real value of adopting a strategy vs. doing nothing.

## Key Files

| File | Role |
|------|------|
| `backend/services/loan_optimizer.py` | `_simulate` (strategy run), `_baseline` (no-strategy run), `optimize_loans` (orchestrator) |
| `backend/schemas/loan_schema.py` | Pydantic models for validation |
