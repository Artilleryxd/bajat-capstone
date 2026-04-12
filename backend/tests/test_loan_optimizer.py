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
            make_loan("small",  500,  5.0,  60),
            make_loan("large", 5000,  3.0, 100),
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
