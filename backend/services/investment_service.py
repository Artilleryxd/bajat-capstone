# backend/services/investment_service.py
"""
Investment strategy service.
- Risk score calculation (deterministic, from TRD §10.3)
- Debt-burden detection
- Goal projection math
- Orchestrates AI call and DB persistence
"""
import logging
from datetime import date, datetime
from typing import Optional

from db.supabase_client import supabase_admin
from schemas.investment_schema import (
    AllocationItem,
    GenerateStrategyRequest,
    GoalProjection,
    InvestmentStrategyResponse,
)
from services.ai_service import generate_investment_strategy_ai, parse_portfolio_from_text

logger = logging.getLogger(__name__)

# DTI threshold above which user is considered debt-heavy
DEBT_HEAVY_DTI = 0.40


# ── Helpers ──────────────────────────────────────────────────────────────────

def _calculate_age(dob_str: Optional[str]) -> Optional[int]:
    if not dob_str:
        return None
    try:
        dob = date.fromisoformat(str(dob_str)[:10])
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None


def calculate_risk_score(
    profile: dict,
    loans: list[dict],
    assets: list[dict],
) -> int:
    """
    Deterministic risk score 0–100 (from TRD §10.3).
    Higher score = more risk-tolerant.
    """
    score = 50.0

    age = _calculate_age(profile.get("date_of_birth"))
    if age is not None:
        score += max(0.0, (35 - age) * 0.8)

    income_type = (profile.get("income_type") or "").lower()
    if income_type == "salaried":
        score += 10
    elif income_type in ("self_employed", "freelance"):
        score -= 5

    num_deps = int(profile.get("num_dependents") or 0)
    score -= num_deps * 5

    monthly_income = float(profile.get("monthly_income") or 0)
    total_emi = sum(float(l.get("emi_amount") or 0) for l in loans)
    if monthly_income > 0:
        dti = total_emi / monthly_income
        score -= dti * 50

    net_worth = sum(float(a.get("current_value") or 0) for a in assets)
    if monthly_income > 0 and net_worth > monthly_income * 60:
        score += 15

    exp_map = {"beginner": -10, "intermediate": 0, "advanced": 15}
    inv_exp = (profile.get("investment_exp") or "").lower()
    score += exp_map.get(inv_exp, 0)

    return max(0, min(100, int(score)))


def risk_profile_from_score(score: int) -> str:
    if score < 35:
        return "conservative"
    if score < 65:
        return "moderate"
    return "aggressive"


def calculate_dti(monthly_income: float, loans: list[dict]) -> float:
    if monthly_income <= 0:
        return 0.0
    total_emi = sum(float(l.get("emi_amount") or 0) for l in loans)
    return total_emi / monthly_income


def calculate_investable_surplus(
    monthly_income: float,
    loans: list[dict],
    num_dependents: int,
    housing_status: Optional[str],
) -> float:
    """
    Rough investable surplus = income − EMIs − estimated living expenses.
    Living expenses heuristic: 35% of income base + 5% per dependent.
    Housing 'rented' adds another 15%.
    """
    total_emi = sum(float(l.get("emi_amount") or 0) for l in loans)
    living_pct = 0.35 + (num_dependents * 0.05)
    if (housing_status or "").lower() == "rented":
        living_pct += 0.15
    living_expenses = monthly_income * living_pct
    surplus = monthly_income - total_emi - living_expenses
    return max(0.0, round(surplus, 2))


_HORIZON_YEARS: dict[str, int] = {
    "short": 3,
    "medium": 7,
    "long": 15,
    "retirement": 25,
}


def calculate_recommended_sip(
    goal_amount: Optional[float],
    current_portfolio_value: float,
    annual_return_pct: float,
    time_horizon: str,
    monthly_income: float,
) -> float:
    """
    Required monthly SIP to reach goal within the time horizon.
    Falls back to 15 % of income when no goal is set.
    """
    years = _HORIZON_YEARS.get(time_horizon or "medium", 7)

    if not goal_amount or goal_amount <= 0:
        return round(monthly_income * 0.15, 2)

    r = annual_return_pct / 100.0
    monthly_r = (1 + r) ** (1 / 12) - 1
    N = years * 12

    fv_portfolio = (current_portfolio_value or 0.0) * (1 + r) ** years
    fv_needed = max(goal_amount - fv_portfolio, 0.0)

    if fv_needed <= 0:
        return 0.0

    if monthly_r > 0:
        sip = fv_needed * monthly_r / ((1 + monthly_r) ** N - 1)
    else:
        sip = fv_needed / N

    return round(max(sip, 0.0), 2)


def calculate_goal_projection(
    current_value: float,
    monthly_sip: float,
    annual_return_pct: float,
    goal_amount: float,
    max_years: int = 40,
) -> GoalProjection:
    r = annual_return_pct / 100.0
    monthly_r = (1 + r) ** (1 / 12) - 1

    def project(years: int) -> float:
        months = years * 12
        fv_lump = current_value * (1 + r) ** years
        if monthly_r > 0:
            fv_sip = monthly_sip * ((1 + monthly_r) ** months - 1) / monthly_r
        else:
            fv_sip = monthly_sip * months
        return fv_lump + fv_sip

    years_to_goal: Optional[float] = None
    for y in range(1, max_years + 1):
        if project(y) >= goal_amount:
            years_to_goal = float(y)
            break

    return GoalProjection(
        years_to_goal=years_to_goal,
        projected_value_5yr=round(project(5), 2),
        projected_value_10yr=round(project(10), 2),
        projected_value_20yr=round(project(20), 2),
        monthly_sip=monthly_sip,
        expected_return_pct=annual_return_pct,
    )


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_latest_strategy(user_id: str) -> Optional[dict]:
    try:
        res = (
            supabase_admin.table("investment_strategies")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error("Failed to fetch investment strategy for %s: %s", user_id, e)
        return None


def _row_to_response(row: dict, is_using_overrides: bool = False) -> InvestmentStrategyResponse:
    allocs = [AllocationItem(**a) for a in (row.get("allocations") or [])]
    gp = None
    if row.get("goal_projection"):
        gp = GoalProjection(**row["goal_projection"])

    return InvestmentStrategyResponse(
        id=row.get("id"),
        risk_score=row.get("risk_score", 50),
        risk_profile=row.get("risk_profile", "moderate"),
        risk_explanation=row.get("risk_explanation") or "",
        is_debt_heavy=row.get("is_debt_heavy", False),
        debt_warning=row.get("debt_warning"),
        allocations=allocs,
        investable_surplus=float(row.get("investable_surplus") or 0),
        recommended_sip=float(row["recommended_sip"]) if row.get("recommended_sip") is not None else None,
        required_sip_for_goal=float(row["required_sip_for_goal"]) if row.get("required_sip_for_goal") is not None else None,
        ai_insights=row.get("ai_insights") or "",
        goal_projection=gp,
        goal_amount=row.get("goal_amount"),
        current_portfolio_value=row.get("current_portfolio_value"),
        sip_date=row.get("sip_date"),
        payout_date=str(row["payout_date"]) if row.get("payout_date") else None,
        estimated_annual_return=row.get("estimated_annual_return"),
        time_horizon=row.get("time_horizon"),
        is_using_overrides=is_using_overrides,
        created_at=str(row["created_at"]) if row.get("created_at") else None,
    )


# ── Main orchestrator ─────────────────────────────────────────────────────────

def generate_strategy(
    user_id: str,
    request: GenerateStrategyRequest,
    save_to_db: bool = True,
) -> InvestmentStrategyResponse:
    """
    Full pipeline:
      1. Fetch profile, loans, assets from DB
      2. Apply any overrides (never persisted)
      3. Calculate risk score + debt burden
      4. Call AI for allocations + insights
      5. Calculate goal projection (if goal provided)
      6. Persist to DB (unless save_to_db=False / override simulation)
    """
    # ── 1. Fetch DB data ────────────────────────────────────────────────────
    profile_res = (
        supabase_admin.table("user_profiles")
        .select("*")
        .eq("id", user_id)
        .execute()
    )
    profile = profile_res.data[0] if profile_res.data else {}

    loans_res = (
        supabase_admin.table("loans")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    loans = loans_res.data or []

    assets_res = (
        supabase_admin.table("user_assets")
        .select("id,current_value,asset_type")
        .eq("user_id", user_id)
        .execute()
    )
    assets = assets_res.data or []

    currency = profile.get("currency", "INR")
    num_deps = int(profile.get("num_dependents") or 0)
    housing = profile.get("housing_status")

    # ── 2. Apply overrides ──────────────────────────────────────────────────
    is_using_overrides = request.overrides is not None
    overrides = request.overrides  # may be None — never coerce to dict

    monthly_income = float(
        (overrides.monthly_income if overrides and overrides.monthly_income else None)
        or profile.get("monthly_income")
        or 0
    )
    investment_exp = (
        (overrides.investment_exp if overrides and overrides.investment_exp else None)
        or profile.get("investment_exp")
        or "beginner"
    )
    time_horizon = (
        (overrides.time_horizon if overrides and overrides.time_horizon else None)
        or "medium"
    )

    # Override-aware profile dict for risk score
    eff_profile = {**profile, "monthly_income": monthly_income, "investment_exp": investment_exp}

    # ── 3. Risk + debt ──────────────────────────────────────────────────────
    risk_score = calculate_risk_score(eff_profile, loans, assets)
    risk_profile_label = risk_profile_from_score(risk_score)
    dti = calculate_dti(monthly_income, loans)
    is_debt_heavy = dti >= DEBT_HEAVY_DTI
    total_emi = sum(float(l.get("emi_amount") or 0) for l in loans)
    investable_surplus = calculate_investable_surplus(monthly_income, loans, num_deps, housing)

    # ── 4. Goal data ────────────────────────────────────────────────────────
    goal = request.goal
    goal_amount = goal.goal_amount if goal else None
    current_portfolio_value = goal.current_portfolio_value if goal else None
    sip_date = goal.sip_date if goal else None
    payout_date = goal.payout_date if goal else None
    portfolio_text = goal.portfolio_text if goal else None

    # If no new goal provided but strategy exists in DB, reuse stored goal data
    if goal is None and save_to_db:
        existing = get_latest_strategy(user_id)
        if existing:
            goal_amount = existing.get("goal_amount")
            current_portfolio_value = existing.get("current_portfolio_value")
            sip_date = existing.get("sip_date")
            payout_date = existing.get("payout_date")
            portfolio_text = existing.get("portfolio_text")

    # ── 5. Budget investment allocation (fetch before AI call) ──────────────
    budget_investment_allocation: Optional[float] = None
    try:
        budget_res = (
            supabase_admin.table("budgets")
            .select("generated_budget")
            .eq("user_id", user_id)
            .eq("is_temporary", False)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if budget_res.data:
            gb = budget_res.data[0].get("generated_budget") or {}
            inv = gb.get("investments") or {}
            if isinstance(inv, dict):
                total = sum(float(v) for v in inv.values() if v)
                budget_investment_allocation = round(total, 2) if total > 0 else None
    except Exception as e:
        logger.warning("Could not fetch budget for SIP alignment: %s", e)

    # ── 6. AI call ──────────────────────────────────────────────────────────
    ai_result = generate_investment_strategy_ai(
        risk_score=risk_score,
        risk_profile=risk_profile_label,
        monthly_income=monthly_income,
        investable_surplus=investable_surplus,
        income_type=profile.get("income_type"),
        num_dependents=num_deps,
        housing_status=housing,
        investment_exp=investment_exp,
        time_horizon=time_horizon,
        is_debt_heavy=is_debt_heavy,
        dti_ratio=dti,
        total_emi=total_emi,
        currency=currency,
        goal_amount=goal_amount,
        current_portfolio_value=current_portfolio_value,
        portfolio_text=portfolio_text,
        budget_investment_allocation=budget_investment_allocation,
        payout_date=payout_date,
    )

    # Fallback allocations if AI fails
    if ai_result is None:
        ai_result = _fallback_allocations(risk_profile_label, is_debt_heavy)

    allocations = [AllocationItem(**a) for a in ai_result.get("allocations", [])]
    risk_explanation = ai_result.get("risk_explanation", "Risk score calculated from your financial profile.")
    ai_insights = ai_result.get("ai_insights", "Strategy generated based on your profile.")
    debt_warning = ai_result.get("debt_warning") if is_debt_heavy else None
    estimated_return = ai_result.get("estimated_annual_return", 10.0)

    # ── 7. SIP calculations ─────────────────────────────────────────────────
    required_sip_for_goal = calculate_recommended_sip(
        goal_amount=goal_amount,
        current_portfolio_value=current_portfolio_value or 0.0,
        annual_return_pct=estimated_return,
        time_horizon=time_horizon,
        monthly_income=monthly_income,
    )
    recommended_sip = budget_investment_allocation if budget_investment_allocation is not None else required_sip_for_goal

    # ── 8. Goal projection ──────────────────────────────────────────────────
    goal_projection: Optional[GoalProjection] = None
    if goal_amount and goal_amount > 0:
        portfolio_return = estimated_return
        if portfolio_text:
            pr = parse_portfolio_from_text(portfolio_text, currency)
            if pr:
                portfolio_return = pr
        cv = current_portfolio_value or 0.0
        goal_projection = calculate_goal_projection(
            current_value=cv,
            monthly_sip=investable_surplus,
            annual_return_pct=portfolio_return,
            goal_amount=goal_amount,
        )

    # ── 9. Persist ──────────────────────────────────────────────────────────
    row_id: Optional[str] = None
    created_at: Optional[str] = None

    if save_to_db:
        # ── Insert strategy row ─────────────────────────────────────────────
        try:
            supabase_admin.table("investment_strategies").update({"is_active": False}).eq(
                "user_id", user_id
            ).execute()

            insert_data: dict = {
                "user_id": user_id,
                "risk_score": risk_score,
                "risk_profile": risk_profile_label,
                "allocations": [a.model_dump() for a in allocations],
                "investable_surplus": investable_surplus,
                "recommended_sip": recommended_sip,
                "required_sip_for_goal": required_sip_for_goal,
                "risk_explanation": risk_explanation,
                "ai_insights": ai_insights,
                "ai_rationale": ai_insights,
                "debt_warning": debt_warning,
                "is_debt_heavy": is_debt_heavy,
                "goal_amount": goal_amount,
                "current_portfolio_value": current_portfolio_value,
                "sip_date": sip_date,
                "portfolio_text": portfolio_text,
                "goal_projection": goal_projection.model_dump() if goal_projection else None,
                "estimated_annual_return": estimated_return,
                "time_horizon": time_horizon,
                "is_active": True,
            }
            # payout_date column added by migration 012 — include only if set
            if payout_date is not None:
                insert_data["payout_date"] = payout_date

            ins_res = supabase_admin.table("investment_strategies").insert(insert_data).execute()
            if ins_res.data:
                row_id = ins_res.data[0].get("id")
                created_at = str(ins_res.data[0].get("created_at", ""))
        except Exception as e:
            logger.error("Failed to insert investment strategy for %s: %s", user_id, e)

        # ── Sync goal fields to user_profiles (independent of strategy insert) ──
        try:
            profile_update: dict = {}
            if goal_amount is not None:
                profile_update["investment_goal"] = goal_amount
            if current_portfolio_value is not None:
                profile_update["current_portfolio"] = current_portfolio_value
            if sip_date is not None:
                profile_update["sip_date"] = sip_date
            if payout_date is not None:
                profile_update["payout_date"] = payout_date
            if profile_update:
                supabase_admin.table("user_profiles").update(profile_update).eq(
                    "id", user_id
                ).execute()
        except Exception as e:
            logger.error("Failed to sync investment goal to user_profiles for %s: %s", user_id, e)
            # Retry without payout_date in case migration 012 is not yet applied
            try:
                profile_update.pop("payout_date", None)
                if profile_update:
                    supabase_admin.table("user_profiles").update(profile_update).eq(
                        "id", user_id
                    ).execute()
                    logger.info("Synced investment goal (without payout_date) for %s", user_id)
            except Exception as e2:
                logger.error("Retry sync also failed for %s: %s", user_id, e2)

    return InvestmentStrategyResponse(
        id=row_id,
        risk_score=risk_score,
        risk_profile=risk_profile_label,
        risk_explanation=risk_explanation,
        is_debt_heavy=is_debt_heavy,
        debt_warning=debt_warning,
        allocations=allocations,
        investable_surplus=investable_surplus,
        recommended_sip=recommended_sip,
        required_sip_for_goal=required_sip_for_goal,
        ai_insights=ai_insights,
        goal_projection=goal_projection,
        goal_amount=goal_amount,
        current_portfolio_value=current_portfolio_value,
        sip_date=sip_date,
        payout_date=payout_date,
        estimated_annual_return=estimated_return,
        time_horizon=time_horizon,
        is_using_overrides=is_using_overrides,
        created_at=created_at,
    )


# ── Fallback ──────────────────────────────────────────────────────────────────

def _fallback_allocations(risk_profile: str, is_debt_heavy: bool) -> dict:
    """Static fallback if AI call fails."""
    if is_debt_heavy or risk_profile == "conservative":
        allocs = [
            {"name": "Bonds & Debt", "percentage": 50, "color": "#8B5CF6", "rationale": "Capital preservation focus."},
            {"name": "Large Cap Equity", "percentage": 20, "color": "#3B82F6", "rationale": "Minimal equity exposure."},
            {"name": "Gold", "percentage": 15, "color": "#F97316", "rationale": "Inflation hedge."},
            {"name": "Liquid/Emergency Fund", "percentage": 15, "color": "#6B7280", "rationale": "Liquidity buffer."},
        ]
    elif risk_profile == "moderate":
        allocs = [
            {"name": "Large Cap Equity", "percentage": 40, "color": "#3B82F6", "rationale": "Core equity exposure."},
            {"name": "Mid Cap Equity", "percentage": 20, "color": "#22C55E", "rationale": "Growth potential."},
            {"name": "Bonds & Debt", "percentage": 25, "color": "#8B5CF6", "rationale": "Stability buffer."},
            {"name": "Gold", "percentage": 10, "color": "#F97316", "rationale": "Diversification."},
            {"name": "Liquid/Emergency Fund", "percentage": 5, "color": "#6B7280", "rationale": "Liquidity."},
        ]
    else:  # aggressive
        allocs = [
            {"name": "Large Cap Equity", "percentage": 35, "color": "#3B82F6", "rationale": "Blue-chip stability."},
            {"name": "Mid Cap Equity", "percentage": 25, "color": "#22C55E", "rationale": "High growth potential."},
            {"name": "Small Cap Equity", "percentage": 20, "color": "#F59E0B", "rationale": "Maximum growth, higher risk."},
            {"name": "International Equity", "percentage": 10, "color": "#EC4899", "rationale": "Global diversification."},
            {"name": "Gold", "percentage": 5, "color": "#F97316", "rationale": "Hedge."},
            {"name": "Liquid/Emergency Fund", "percentage": 5, "color": "#6B7280", "rationale": "Liquidity."},
        ]
    return {
        "allocations": allocs,
        "risk_explanation": "Risk score derived from your age, income, dependents, and debt load.",
        "ai_insights": "This strategy is tailored to your risk profile. Review regularly as your financial situation evolves.",
        "debt_warning": "Your EMI commitments are high. Consider reducing debt before increasing equity exposure." if is_debt_heavy else None,
        "estimated_annual_return": 8.0 if risk_profile == "conservative" else (10.0 if risk_profile == "moderate" else 12.0),
    }
