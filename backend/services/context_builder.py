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
