"""Budget API endpoints for generation, spending summary, and latest retrieval."""

import logging
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from db.supabase_client import supabase_admin
from services.budget_ai import BudgetInput, generate_budget_plan
from utils.jwt_verifier import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/budget", tags=["budget"])


def _safe_first(data: list[dict[str, Any]] | None) -> dict[str, Any]:
    if data and len(data) > 0:
        return data[0]
    return {}


def _resolve_location(profile: dict[str, Any], override_location: str | None = None) -> str:
    if override_location and override_location.strip():
        return override_location.strip()

    neighbourhood = (profile.get("neighbourhood") or "").strip()
    city = (profile.get("city") or "").strip()

    if neighbourhood and city:
        return f"{neighbourhood}, {city}"
    if city:
        return city
    if neighbourhood:
        return neighbourhood
    return "Unknown"


async def _fetch_user_profile(user_id: str) -> dict[str, Any]:
    try:
        profile_result = (
            supabase_admin.table("user_profiles").select("*").eq("id", user_id).limit(1).execute()
        )
        return _safe_first(profile_result.data)
    except Exception as exc:
        logger.error("Failed to fetch user profile for budget: %s", exc)
        return {}


async def _fetch_user_loans_assets(user_id: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    loans: list[dict[str, Any]] = []
    assets: list[dict[str, Any]] = []

    try:
        loans_result = supabase_admin.table("loans").select("*").eq("user_id", user_id).execute()
        if loans_result.data:
            loans = loans_result.data
    except Exception as exc:
        logger.warning("Could not fetch loans for user %s: %s", user_id, exc)

    try:
        assets_result = supabase_admin.table("user_assets").select("*").eq("user_id", user_id).execute()
        if assets_result.data:
            assets = assets_result.data
    except Exception as exc:
        logger.warning("Could not fetch assets for user %s: %s", user_id, exc)

    return loans, assets


async def _build_budget_input(user_id: str) -> BudgetInput:
    profile = await _fetch_user_profile(user_id)
    loans, assets = await _fetch_user_loans_assets(user_id)

    income = profile.get("monthly_income")
    location = _resolve_location(profile)
    dependents = profile.get("num_dependents", 0)

    if income is None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "MISSING_INCOME",
                "message": "Income is required. Complete onboarding or provide income override.",
            },
        )

    return BudgetInput(
        income=float(income),
        location=location,
        dependents=int(dependents or 0),
        housing_status=str(profile.get("housing_status", "rented")),
        marital_status=str(profile.get("marital_status", "single")),
        income_type=str(profile.get("income_type", "salaried")),
        loans=loans,
        assets=assets,
    )


async def _next_budget_version(user_id: str) -> int:
    try:
        res = (
            supabase_admin.table("budgets").select("version").eq("user_id", user_id).order("version", desc=True).limit(1).execute()
        )
        latest = _safe_first(res.data)
        return int(latest.get("version", 0)) + 1
    except Exception as exc:
        logger.warning("Could not resolve next budget version, defaulting to 1: %s", exc)
        return 1


@router.post("/generate")
async def generate_budget(user: dict = Depends(get_current_user)):
    """
    Generate budget from profile + loans + assets and persist as non-temporary.
    """
    try:
        budget_input = await _build_budget_input(user_id=user["id"])
        generated_budget = await generate_budget_plan(budget_input)
        version = await _next_budget_version(user["id"])

        row = {
            "user_id": user["id"],
            "version": version,
            "generated_budget": generated_budget,
            "is_temporary": False,
        }

        try:
            supabase_admin.table("budgets").insert(row).execute()
        except Exception as exc:
            logger.error("Failed to persist generated budget: %s", exc)
            raise HTTPException(
                status_code=500,
                detail={"code": "BUDGET_SAVE_FAILED", "message": "Failed to save generated budget."},
            )

        return generated_budget
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Budget generation endpoint failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "BUDGET_GENERATE_FAILED", "message": "Failed to generate budget."},
        )


@router.get("/latest")
async def latest_budget(user: dict = Depends(get_current_user)):
    """Return the most recent non-temporary generated budget for the user."""
    try:
        res = (
            supabase_admin.table("budgets")
            .select("id,user_id,version,generated_budget,is_temporary,created_at")
            .eq("user_id", user["id"])
            .eq("is_temporary", False)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        latest = _safe_first(res.data)
        if not latest:
            raise HTTPException(
                status_code=404,
                detail={"code": "BUDGET_NOT_FOUND", "message": "No saved budget found."},
            )

        return latest["generated_budget"]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Fetch latest budget failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "BUDGET_FETCH_FAILED", "message": "Failed to fetch latest budget."},
        )


@router.get("/spending-summary")
async def spending_summary(user: dict = Depends(get_current_user)):
    """
    Return current month's actual spending grouped by budget category.
    Used by the frontend to show "spent vs budgeted" on chart hover.
    """
    try:
        today = date.today()
        month_year = date(today.year, today.month, 1).isoformat()

        result = (
            supabase_admin.table("expenses")
            .select("amount,category")
            .eq("user_id", user["id"])
            .eq("month_year", month_year)
            .execute()
        )

        expenses = result.data or []

        summary = {
            "needs": 0.0,
            "wants": 0.0,
            "investments": 0.0,
            "repayment": 0.0,
            "emergency": 0.0,
        }

        # Map expense categories to budget sections
        category_mapping = {
            "needs": "needs",
            "wants": "wants",
            "desires": "wants",  # desires map to wants
            "investments": "investments",
        }

        for exp in expenses:
            amount = float(exp.get("amount", 0))
            cat = (exp.get("category") or "").lower()
            budget_section = category_mapping.get(cat)
            if budget_section:
                summary[budget_section] += round(amount, 2)

        # Repayment spend = sum of EMIs from loans (they're fixed monthly)
        try:
            loans_result = supabase_admin.table("loans").select("*").eq("user_id", user["id"]).execute()
            if loans_result.data:
                from services.budget_ai import _extract_total_emi
                summary["repayment"] = round(_extract_total_emi(loans_result.data), 2)
        except Exception as exc:
            logger.warning("Could not fetch loan EMIs for spending summary: %s", exc)

        return {
            "month_year": month_year,
            "summary": summary,
        }
    except Exception as exc:
        logger.error("Spending summary failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "SPENDING_SUMMARY_FAILED", "message": "Failed to fetch spending summary."},
        )