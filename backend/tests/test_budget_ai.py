import asyncio
import sys
from pathlib import Path
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.budget_ai import BudgetInput, generate_budget_plan


async def _run_budget_ai_call() -> dict:
    payload = BudgetInput(
        income=100000,
        location="Kharghar",
        dependents=3,
        loans=[{"emi_amount": 45000}],
        assets=[{"type": "savings", "value": 250000}],
    )

    # Force AI failure to validate deterministic fallback behavior.
    async def _raise_ai_failure(*args, **kwargs):
        raise ValueError("Invalid AI JSON")

    async def _rent_stub(location: str, dependents: int) -> dict:
        assert location == "Kharghar"
        assert dependents == 3
        return {
            "recommended_bhk": "2BHK",
            "avg_rent": 32000,
            "min_rent": 28000,
            "max_rent": 38000,
        }

    with patch("services.budget_ai._call_claude_budget_json", side_effect=_raise_ai_failure):
        with patch("services.budget_ai.get_rent_estimate", side_effect=_rent_stub):
            return await generate_budget_plan(payload)


def test_budget_ai_kharghar_dependents_3() -> None:
    result = asyncio.run(_run_budget_ai_call())

    # Rent is capped in fallback when EMI is high, but should be > 0
    assert result["needs"]["rent"] > 0
    assert result["needs"]["rent"] <= 32000
    # All needs values should be positive
    assert all(v > 0 for v in result["needs"].values()), f"Negative needs found: {result['needs']}"
    assert isinstance(result["repayment"], dict)
    assert sum(result["repayment"].values()) == 45000
    assert isinstance(result["insights"], list)
    assert all(isinstance(item, str) for item in result["insights"])
    assert isinstance(result["wants"], dict) and sum(result["wants"].values()) > 0
    assert isinstance(result["investments"], dict) and sum(result["investments"].values()) > 0
    assert result["emergency"] > 0


async def _run_overallocated_ai_result_call() -> dict:
    payload = BudgetInput(
        income=50000,
        location="Mumbai",
        dependents=1,
        housing_status="rented",
        loans=[{"emi_amount": 5000}],
        assets=[],
    )

    async def _ai_overallocated(*args, **kwargs):
        return {
            "needs": {
                "rent": 30000,
                "groceries": 12000,
                "commute": 4000,
            },
            "wants": {"dining_out": 8000, "shopping": 7000},
            "investments": {"mutual_funds": 6000, "ppf_epf": 4000},
            "emergency": 3000,
            "repayment": {"personal_loan_emi": 5000},
            "insights": ["sample"],
        }

    async def _rent_stub(location: str, dependents: int) -> dict:
        assert location == "Mumbai"
        assert dependents == 1
        return {
            "recommended_bhk": "1BHK",
            "avg_rent": 30000,
            "min_rent": 25000,
            "max_rent": 35000,
        }

    with patch("services.budget_ai._call_claude_budget_json", side_effect=_ai_overallocated):
        with patch("services.budget_ai.get_rent_estimate", side_effect=_rent_stub):
            return await generate_budget_plan(payload)


def test_budget_total_never_exceeds_income() -> None:
    result = asyncio.run(_run_overallocated_ai_result_call())

    total = (
        sum(result["needs"].values())
        + sum(result["wants"].values())
        + sum(result["investments"].values())
        + result["emergency"]
        + sum(result["repayment"].values())
    )

    assert total <= 50000