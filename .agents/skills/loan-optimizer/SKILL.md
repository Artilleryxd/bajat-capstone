---
name: loan-optimizer
description: >
  Use this skill when building the loan optimisation system: EMI strategy
  calculation (avalanche/snowball/hybrid), debt-vs-invest comparison,
  refinancing recommendations, loan data input forms, or the loan chat window.
triggers:
  - "loan"
  - "EMI"
  - "debt"
  - "avalanche"
  - "snowball"
  - "refinance"
  - "interest rate"
  - "prepay"
  - "loan strategy"
  - "close loan"
---

# FinSight AI — Loan Optimisation Skill

## Strategy Selection Logic
```
if max_loan_rate < expected_equity_return AND user.investment_exp != 'beginner':
    → Recommend investing surplus instead of prepaying

elif monthly_income < sum(all_emis) * 1.3:
    → Trigger refinancing flow: collect asset list → recommend balance transfer

elif len(active_loans) >= 3:
    → Default to Avalanche (mathematically optimal for multiple loans)

else:
    → Let Sonnet decide Avalanche vs Snowball based on profile
```

## Amortization (Avalanche)
```python
# backend/app/services/loan_service.py
from dataclasses import dataclass

@dataclass
class Loan:
    id: str
    principal: float
    rate: float      # annual %
    emi: float
    emis_remaining: int

def avalanche_strategy(loans: list[Loan], monthly_surplus: float) -> dict:
    """
    Target highest-rate loan with surplus. Others pay minimum EMI.
    Returns full monthly schedule + total interest + months saved.
    """
    loans = sorted(loans, key=lambda l: l.rate, reverse=True)
    principals = {l.id: l.principal for l in loans}
    schedule = []
    total_interest = 0
    month = 0

    while any(p > 0 for p in principals.values()):
        month += 1
        month_data = {}
        remaining_extra = monthly_surplus - sum(l.emi for l in loans if principals[l.id] > 0)

        for i, loan in enumerate(loans):
            if principals[loan.id] <= 0:
                continue
            monthly_rate = loan.rate / 100 / 12
            interest = principals[loan.id] * monthly_rate
            payment = loan.emi + (remaining_extra if i == 0 else 0)
            principal_paid = min(payment - interest, principals[loan.id])
            principals[loan.id] -= principal_paid
            total_interest += interest
            month_data[loan.id] = {"payment": payment, "interest": interest, "balance": principals[loan.id]}

        schedule.append({"month": month, "detail": month_data})
        if month > 600: break  # safety cap (50 years)

    return {
        "strategy": "avalanche",
        "schedule": schedule[:24],  # return first 24 months only; store full in JSONB
        "total_months": month,
        "total_interest": round(total_interest, 2),
    }

def calculate_savings(normal: dict, optimised: dict) -> dict:
    return {
        "interest_saved": round(normal["total_interest"] - optimised["total_interest"], 2),
        "months_saved": normal["total_months"] - optimised["total_months"],
    }
```

## Invest vs Prepay Decision
```python
INVEST_VS_PREPAY_THRESHOLD = 0.02  # invest if equity return > loan rate by 2%+

def should_invest_instead(loan_rate: float, expected_equity_return: float = 0.12) -> bool:
    """
    Rule: If post-tax equity return exceeds loan interest rate by > 2%,
    investing surplus creates more wealth than prepaying.
    Assume 12% long-run equity return (conservative Indian market estimate).
    """
    return (expected_equity_return - loan_rate / 100) > INVEST_VS_PREPAY_THRESHOLD
```

## Refinancing Flow
```python
# Triggered when income < 1.3x total EMIs
# 1. Ask user for owned assets (fed from asset tracker)
# 2. Calculate loan-to-value eligible for secured loan
# 3. Recommend: use asset as collateral to get lower-rate loan → repay high-rate loan

REFINANCE_PROMPT = """
The user cannot accelerate repayment from income alone.
Their assets are: {assets_summary}
Their highest-rate loan is: {worst_loan}

Recommend a refinancing strategy:
- Which asset could be used as collateral
- Approximate secured loan rate they might qualify for
- How much interest they would save
- Risks to communicate clearly

Do NOT recommend specific lenders or guarantee specific rates.
"""
```

## Loan Strategy Storage
```python
# Always store with full schedule in JSONB
supabase.table("loan_strategies").insert({
    "user_id": user_id,
    "strategy_type": strategy["strategy"],
    "strategy_data": {
        "schedule_24m": strategy["schedule"],  # first 24 months
        "total_months": strategy["total_months"],
        "total_interest": strategy["total_interest"],
        "loans_snapshot": [vars(l) for l in loans],
    },
    "ai_rationale": ai_rationale_text,
    "total_saved": savings["interest_saved"],
    "months_saved": savings["months_saved"],
}).execute()
```

## Loan Chat Module Instructions
```python
LOAN_MODULE_INSTRUCTIONS = """
The user is reviewing their loan optimisation strategy.
They may question the method chosen, the repayment order, or the numbers.

When explaining:
1. Show the total interest under current plan vs optimised plan
2. Show months saved
3. Explain why this loan is targeted first (highest rate = most expensive)
4. If they have investments, address the invest-vs-prepay question directly

If they want to explore a different strategy (snowball vs avalanche),
offer to generate a comparison showing both side by side.
"""
```
