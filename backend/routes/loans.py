# backend/routes/loans.py
"""Loan CRUD and optimisation endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException

from db.supabase_client import supabase_admin
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
            supabase_admin.table("loans")
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
        res = supabase_admin.table("loans").insert(data).execute()
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
            supabase_admin.table("loans")
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
            supabase_admin.table("user_profiles")
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

        # 4. Run deterministic optimization
        result = optimize_loans(
            loans,
            monthly_income=monthly_income,
        )

        # 5. Build enriched payoff order (per-loan data + loan metadata)
        best_key = result["best_strategy"]
        raw_payoff_order = result["comparison"][best_key].get("loan_payoff_order", [])
        loan_row_by_id = {row["id"]: row for row in loan_rows}

        enriched_payoff_order = [
            {
                "loan_id": p["loan_id"],
                "loan_type": loan_row_by_id.get(p["loan_id"], {}).get("loan_type", "Loan"),
                "lender": loan_row_by_id.get(p["loan_id"], {}).get("lender"),
                "interest_rate": float(loan_row_by_id.get(p["loan_id"], {}).get("interest_rate", 0)),
                "balance": float(loan_row_by_id.get(p["loan_id"], {}).get("principal_outstanding", 0)),
                "emi_amount": float(loan_row_by_id.get(p["loan_id"], {}).get("emi_amount", 0)),
                "closes_at_month": p["closes_at_month"],
                "total_interest_paid": p["total_interest_paid"],
                "total_payment": p["total_payment"],
            }
            for p in raw_payoff_order
        ]

        # loans_info for AI — same data, shaped for the prompt
        loans_info_for_ai = [
            {
                "loan_type": e["loan_type"],
                "lender": e["lender"],
                "rate": e["interest_rate"],
                "balance": e["balance"],
                "emi": e["emi_amount"],
                "closes_at_month": e["closes_at_month"],
                "interest_paid": e["total_interest_paid"],
            }
            for e in enriched_payoff_order
        ]

        # 6. Generate AI explanation (graceful degradation on failure)
        highest_rate = max(l.interest_rate for l in loans)
        ai_explanation = generate_loan_explanation(
            best_strategy=result["best_strategy"],
            total_saved=result["total_saved"],
            months_saved=result["months_saved"],
            highest_rate=highest_rate,
            monthly_surplus=result["monthly_surplus"],
            total_emi=total_emi,
            currency=currency,
            interest_diff=result["interest_diff"],
            months_diff=result["months_diff"],
            optimization_mode=result["optimization_basis"]["mode"],
            avalanche_score=result["strategy_scores"]["avalanche"],
            snowball_score=result["strategy_scores"]["snowball"],
            loans_info=loans_info_for_ai,
        ) or ""

        # 7. Deactivate previous strategies, insert new one
        supabase_admin.table("loan_strategies").update({"is_active": False}).eq(
            "user_id", user["id"]
        ).execute()

        best_key = result["best_strategy"]
        best_full_schedule = result["_full_schedules"][best_key]
        best_comparison = result["comparison"][best_key]

        supabase_admin.table("loan_strategies").insert(
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
            "interest_diff": result["interest_diff"],
            "months_diff": result["months_diff"],
            "monthly_surplus": result["monthly_surplus"],
            "optimization_basis": result["optimization_basis"],
            "strategy_scores": result["strategy_scores"],
            "loan_payoff_order": enriched_payoff_order,
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
