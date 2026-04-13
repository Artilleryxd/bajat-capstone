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


def _simulate(loans: list[Loan], monthly_budget: float, strategy: str) -> dict:
    """
    Run month-by-month amortization.

    monthly_budget: total money available per month for ALL loan payments combined.
                    e.g. monthly_income, or sum(all EMIs) for baseline.
    strategy: 'avalanche' | 'snowball'

    Each month:
      1. Every active loan gets its minimum EMI.
      2. Whatever is left over (monthly_budget - sum of active EMIs) goes to the
         highest-priority loan first, then cascades if that loan closes.

    When a loan closes, its EMI frees up automatically (it drops from the active
    list, so next month's surplus grows by that EMI amount).
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
        # Extra money beyond minimum EMIs — grows as loans close
        remaining_extra = max(0.0, monthly_budget - min_emi_total)

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
        "schedule": schedule,
        "timeline": timeline,
    }


def _baseline(loans: list[Loan]) -> dict:
    """
    Baseline: each loan pays its own EMI independently with no reallocation.
    When a loan closes, its freed-up EMI is NOT redirected to other loans.
    Used to compute interest/months saved by optimization strategies.
    """
    total_interest = 0.0
    max_months = 0

    for loan in loans:
        balance = float(loan.principal_outstanding)
        monthly_rate = loan.interest_rate / 100.0 / 12.0
        for m in range(1, MAX_MONTHS + 1):
            if balance <= 0.005:
                break
            interest = round(balance * monthly_rate, 2)
            payment = loan.emi_amount
            max_payable = round(balance + interest, 2)
            if payment >= max_payable:
                payment = max_payable
            principal_paid = round(payment - interest, 2)
            balance = round(max(0.0, balance - principal_paid), 6)
            total_interest += interest
            max_months = max(max_months, m)

    return {
        "total_interest_paid": round(total_interest, 2),
        "months_to_close": max_months,
    }


def optimize_loans(
    loans: list[Loan],
    monthly_income: float,
) -> dict:
    """
    Run avalanche and snowball simulations and return comparison dict.

    monthly_income: user's total monthly income. The total budget for loan
    payments is monthly_income (or sum of all EMIs if income is lower).
    """
    if not loans:
        raise ValueError("No loans to optimize")

    total_emi = sum(l.emi_amount for l in loans)
    # Budget is at least total EMIs (can't pay less than minimums)
    monthly_budget = max(total_emi, monthly_income)

    avalanche = _simulate(loans, monthly_budget, "avalanche")
    snowball = _simulate(loans, monthly_budget, "snowball")

    # Baseline: each loan independently, no reallocation
    baseline = _baseline(loans)

    best = (
        "avalanche"
        if avalanche["total_interest_paid"] <= snowball["total_interest_paid"]
        else "snowball"
    )
    best_result = avalanche if best == "avalanche" else snowball

    total_saved = round(baseline["total_interest_paid"] - best_result["total_interest_paid"], 2)
    months_saved = baseline["months_to_close"] - best_result["months_to_close"]

    # Interest difference between the two strategies
    interest_diff = round(
        abs(avalanche["total_interest_paid"] - snowball["total_interest_paid"]), 2
    )
    months_diff = abs(avalanche["months_to_close"] - snowball["months_to_close"])

    def trimmed(result: dict) -> dict:
        """Return strategy dict with schedule limited to first 24 months for API response."""
        return {**result, "schedule": result["schedule"][:24]}

    return {
        "best_strategy": best,
        "comparison": {
            "avalanche": trimmed(avalanche),
            "snowball": trimmed(snowball),
        },
        "_full_schedules": {
            "avalanche": avalanche["schedule"],
            "snowball": snowball["schedule"],
        },
        "total_saved": total_saved,
        "months_saved": months_saved,
        "interest_diff": interest_diff,
        "months_diff": months_diff,
        "monthly_surplus": max(0.0, monthly_income - total_emi),
    }
