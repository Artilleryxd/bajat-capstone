# backend/tests/test_investment_strategy.py
import pytest
from services.investment_service import (
    calculate_risk_score,
    risk_profile_from_score,
    calculate_dti,
    calculate_investable_surplus,
    calculate_goal_projection,
    _fallback_allocations,
)
from schemas.investment_schema import GoalProjection


# ── Fixtures ──────────────────────────────────────────────────────────────────

def profile(**kwargs):
    base = {
        "date_of_birth": "1990-01-01",
        "income_type": "salaried",
        "num_dependents": 0,
        "monthly_income": 100_000,
        "investment_exp": "intermediate",
        "housing_status": "owned",
    }
    return {**base, **kwargs}


def loan(emi: float) -> dict:
    return {"emi_amount": emi}


def asset(value: float) -> dict:
    return {"current_value": value, "asset_type": "equity"}


# ── Risk Score ────────────────────────────────────────────────────────────────

class TestRiskScore:
    def test_base_score_is_fifty(self):
        """No profile data beyond income → near-base score."""
        p = {"date_of_birth": None, "income_type": "salaried",
             "num_dependents": 0, "monthly_income": 100_000,
             "investment_exp": "intermediate", "housing_status": "owned"}
        score = calculate_risk_score(p, [], [])
        assert 40 <= score <= 70

    def test_young_age_increases_score(self):
        young = profile(date_of_birth="2000-01-01")
        old   = profile(date_of_birth="1960-01-01")
        assert calculate_risk_score(young, [], []) > calculate_risk_score(old, [], [])

    def test_salaried_higher_than_freelance(self):
        sal  = profile(income_type="salaried")
        free = profile(income_type="freelance")
        assert calculate_risk_score(sal, [], []) > calculate_risk_score(free, [], [])

    def test_dependents_reduce_score(self):
        no_deps   = profile(num_dependents=0)
        many_deps = profile(num_dependents=4)
        assert calculate_risk_score(no_deps, [], []) > calculate_risk_score(many_deps, [], [])

    def test_high_dti_reduces_score(self):
        p = profile(monthly_income=100_000)
        no_emi  = []
        high_emi = [loan(50_000)]  # 50 % DTI
        assert calculate_risk_score(p, no_emi, []) > calculate_risk_score(p, high_emi, [])

    def test_high_net_worth_increases_score(self):
        p = profile(monthly_income=100_000)
        rich_assets = [asset(100_000 * 80)]   # > 60× income
        assert calculate_risk_score(p, [], rich_assets) > calculate_risk_score(p, [], [])

    def test_advanced_exp_higher_than_beginner(self):
        adv = profile(investment_exp="advanced")
        beg = profile(investment_exp="beginner")
        assert calculate_risk_score(adv, [], []) > calculate_risk_score(beg, [], [])

    def test_score_bounded_0_to_100(self):
        extreme_high = profile(
            date_of_birth="2005-01-01",
            income_type="salaried",
            num_dependents=0,
            monthly_income=1_000_000,
            investment_exp="advanced",
        )
        extreme_low = profile(
            date_of_birth="1950-01-01",
            income_type="freelance",
            num_dependents=10,
            monthly_income=10_000,
            investment_exp="beginner",
        )
        assert 0 <= calculate_risk_score(extreme_high, [], []) <= 100
        assert 0 <= calculate_risk_score(extreme_low, [loan(9_000)], []) <= 100


# ── Risk Profile Label ─────────────────────────────────────────────────────────

class TestRiskProfileFromScore:
    @pytest.mark.parametrize("score,expected", [
        (0,  "conservative"),
        (34, "conservative"),
        (35, "moderate"),
        (64, "moderate"),
        (65, "aggressive"),
        (100,"aggressive"),
    ])
    def test_boundaries(self, score, expected):
        assert risk_profile_from_score(score) == expected


# ── DTI ───────────────────────────────────────────────────────────────────────

class TestCalculateDTI:
    def test_zero_when_no_loans(self):
        assert calculate_dti(100_000, []) == 0.0

    def test_zero_when_no_income(self):
        assert calculate_dti(0, [loan(10_000)]) == 0.0

    def test_correct_ratio(self):
        assert calculate_dti(100_000, [loan(30_000), loan(10_000)]) == pytest.approx(0.40)


# ── Investable Surplus ────────────────────────────────────────────────────────

class TestCalculateInestableSurplus:
    def test_surplus_reduces_with_emi(self):
        no_loan = calculate_investable_surplus(100_000, [], 0, "owned")
        with_loan = calculate_investable_surplus(100_000, [loan(20_000)], 0, "owned")
        assert no_loan > with_loan

    def test_rented_housing_reduces_surplus(self):
        owned  = calculate_investable_surplus(100_000, [], 0, "owned")
        rented = calculate_investable_surplus(100_000, [], 0, "rented")
        assert owned > rented

    def test_more_dependents_reduces_surplus(self):
        no_deps   = calculate_investable_surplus(100_000, [], 0, "owned")
        with_deps = calculate_investable_surplus(100_000, [], 3, "owned")
        assert no_deps > with_deps

    def test_surplus_never_negative(self):
        # Income barely covers EMI
        surplus = calculate_investable_surplus(10_000, [loan(9_500)], 5, "rented")
        assert surplus == 0.0


# ── Goal Projection ───────────────────────────────────────────────────────────

class TestCalculateGoalProjection:
    def test_returns_goal_projection_type(self):
        result = calculate_goal_projection(
            current_value=0, monthly_sip=10_000,
            annual_return_pct=10.0, goal_amount=1_000_000,
        )
        assert isinstance(result, GoalProjection)

    def test_projected_values_grow_over_time(self):
        result = calculate_goal_projection(
            current_value=0, monthly_sip=10_000,
            annual_return_pct=10.0, goal_amount=100_000_000,
        )
        assert result.projected_value_5yr < result.projected_value_10yr < result.projected_value_20yr

    def test_years_to_goal_set_when_reachable(self):
        # Small goal → reachable quickly
        result = calculate_goal_projection(
            current_value=0, monthly_sip=50_000,
            annual_return_pct=10.0, goal_amount=500_000,
        )
        assert result.years_to_goal is not None
        assert result.years_to_goal <= 10

    def test_years_to_goal_none_when_unreachable(self):
        # Tiny SIP, enormous goal
        result = calculate_goal_projection(
            current_value=0, monthly_sip=1,
            annual_return_pct=0.0, goal_amount=1_000_000_000_000,
        )
        assert result.years_to_goal is None

    def test_existing_portfolio_reduces_years(self):
        no_corpus = calculate_goal_projection(
            current_value=0, monthly_sip=10_000,
            annual_return_pct=10.0, goal_amount=2_000_000,
        )
        with_corpus = calculate_goal_projection(
            current_value=1_500_000, monthly_sip=10_000,
            annual_return_pct=10.0, goal_amount=2_000_000,
        )
        assert (with_corpus.years_to_goal or 99) < (no_corpus.years_to_goal or 99)

    def test_higher_return_reduces_years(self):
        low  = calculate_goal_projection(0, 10_000, 5.0,  2_000_000)
        high = calculate_goal_projection(0, 10_000, 15.0, 2_000_000)
        assert (high.years_to_goal or 99) < (low.years_to_goal or 99)


# ── Fallback Allocations ──────────────────────────────────────────────────────

class TestFallbackAllocations:
    @pytest.mark.parametrize("profile_label,debt_heavy", [
        ("conservative", False),
        ("conservative", True),
        ("moderate",     False),
        ("aggressive",   False),
    ])
    def test_allocations_sum_to_100(self, profile_label, debt_heavy):
        result = _fallback_allocations(profile_label, debt_heavy)
        total = sum(a["percentage"] for a in result["allocations"])
        assert total == pytest.approx(100.0)

    def test_debt_heavy_uses_conservative_mix(self):
        result = _fallback_allocations("aggressive", is_debt_heavy=True)
        names = [a["name"] for a in result["allocations"]]
        assert any("Bond" in n or "Debt" in n for n in names)

    def test_aggressive_has_small_cap(self):
        result = _fallback_allocations("aggressive", is_debt_heavy=False)
        names = [a["name"] for a in result["allocations"]]
        assert any("Small Cap" in n for n in names)

    def test_estimated_return_present(self):
        for label in ("conservative", "moderate", "aggressive"):
            result = _fallback_allocations(label, False)
            assert isinstance(result["estimated_annual_return"], float)
            assert result["estimated_annual_return"] > 0

    def test_all_allocations_have_required_keys(self):
        result = _fallback_allocations("moderate", False)
        for alloc in result["allocations"]:
            assert {"name", "percentage", "color", "rationale"} <= alloc.keys()
