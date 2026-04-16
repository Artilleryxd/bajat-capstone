"""Net worth intelligence service — exact + approximate net worth calculations."""

import json
import logging
import os
from typing import Optional

from db.supabase_client import supabase_admin
from services.asset_service import (
    get_all_assets,
    get_all_liabilities,
    GROWTH_RATES,
)

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-6"


def _get_anthropic_client():
    """Create Anthropic client for Sonnet calls."""
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key)


async def calculate_exact_net_worth(user_id: str) -> dict:
    """
    Calculate exact net worth from known data.
    Net Worth = Total Assets - Total Liabilities
    """
    assets = await get_all_assets(user_id)
    liabilities = await get_all_liabilities(user_id)

    total_assets = sum(
        float(a.get("current_value", 0) or a.get("purchase_price", 0) or 0)
        for a in assets
    )
    total_liabilities = sum(
        float(l.get("principal_outstanding", 0))
        for l in liabilities
    )

    net_worth = total_assets - total_liabilities
    debt_ratio = round((total_liabilities / total_assets * 100), 1) if total_assets > 0 else 0

    return {
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth": round(net_worth, 2),
        "debt_ratio": debt_ratio,
        "asset_count": len(assets),
        "liability_count": len(liabilities),
        "assets": assets,
        "liabilities": liabilities,
    }


async def estimate_net_worth(user_id: str) -> dict:
    """
    AI-powered approximate net worth estimation.
    Uses a hybrid approach: heuristic rules + Claude Sonnet reasoning.

    Returns:
    {
        "estimated_net_worth": float,
        "confidence": float (0-1),
        "range": { "min": float, "max": float },
        "reasoning": str
    }
    """
    # Step 1: Gather all available data
    exact = await calculate_exact_net_worth(user_id)

    # Fetch user profile for income/demographics
    profile = None
    try:
        result = (
            supabase_admin
            .table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .execute()
        )
        if result.data:
            profile = result.data[0]
    except Exception as e:
        logger.warning("Could not fetch profile for estimation: %s", e)

    # Fetch expense summary (last 3 months)
    expense_summary = None
    try:
        from datetime import date, timedelta
        three_months_ago = (date.today().replace(day=1) - timedelta(days=90)).isoformat()
        result = (
            supabase_admin
            .table("expenses")
            .select("amount, category")
            .eq("user_id", user_id)
            .gte("month_year", three_months_ago)
            .execute()
        )
        if result.data:
            total_expenses = sum(float(e.get("amount", 0)) for e in result.data)
            months = max(1, 3)
            expense_summary = {
                "total_last_3_months": round(total_expenses, 2),
                "monthly_average": round(total_expenses / months, 2),
                "transaction_count": len(result.data),
            }
    except Exception as e:
        logger.warning("Could not fetch expenses for estimation: %s", e)

    # Step 2: Heuristic estimation
    heuristic_estimate = _heuristic_net_worth(exact, profile, expense_summary)

    # Step 3: AI estimation (Claude Sonnet) — only if we have enough data
    has_enough_data = profile or exact["asset_count"] > 0 or expense_summary
    if not has_enough_data:
        return {
            "estimated_net_worth": exact["net_worth"],
            "confidence": 0.3,
            "range": {
                "min": exact["net_worth"] * 0.8,
                "max": exact["net_worth"] * 1.2,
            },
            "reasoning": "Insufficient data for AI estimation. Showing exact known values only.",
        }

    ai_estimate = await _ai_estimate_net_worth(exact, profile, expense_summary)

    # Step 4: Blend heuristic and AI estimates
    if ai_estimate:
        # Weighted average: AI gets more weight if confidence is high
        ai_conf = ai_estimate.get("confidence", 0.5)
        blended = (
            heuristic_estimate["estimated_net_worth"] * (1 - ai_conf * 0.6)
            + ai_estimate["estimated_net_worth"] * (ai_conf * 0.6)
        )
        return {
            "estimated_net_worth": round(blended, 2),
            "confidence": round(ai_estimate.get("confidence", 0.5), 2),
            "range": ai_estimate.get("range", heuristic_estimate["range"]),
            "reasoning": ai_estimate.get("reasoning", heuristic_estimate["reasoning"]),
        }

    return heuristic_estimate


def _heuristic_net_worth(exact: dict, profile: Optional[dict], expenses: Optional[dict]) -> dict:
    """
    Rule-based estimation when AI is unavailable or for blending.
    """
    known_net_worth = exact["net_worth"]
    monthly_income = 0
    confidence = 0.4

    if profile:
        monthly_income = float(profile.get("monthly_income", 0) or 0)
        # Estimate annual savings capacity
        monthly_expenses = expenses["monthly_average"] if expenses else monthly_income * 0.65
        monthly_savings = max(0, monthly_income - monthly_expenses)

        # Adjustment signals
        adjustment = 0
        num_dependents = int(profile.get("num_dependents", 0) or 0)
        if num_dependents > 0:
            adjustment -= monthly_income * 0.05 * num_dependents  # dependents reduce savings
        if profile.get("housing_status") == "owned":
            adjustment += monthly_income * 6  # owned housing adds value
        if profile.get("has_existing_loans"):
            adjustment -= monthly_income * 2  # loans drag down
        if profile.get("investment_exp") == "advanced":
            adjustment += monthly_income * 3  # experienced investors likely have more
        elif profile.get("investment_exp") == "beginner":
            adjustment -= monthly_income * 1

        estimated = known_net_worth + adjustment + (monthly_savings * 6)
        confidence = 0.55
    else:
        estimated = known_net_worth
        confidence = 0.35

    # Range calculation
    range_factor = (1 - confidence) * 0.5 + 0.1  # Lower confidence = wider range
    estimate_min = estimated * (1 - range_factor)
    estimate_max = estimated * (1 + range_factor)

    return {
        "estimated_net_worth": round(estimated, 2),
        "confidence": round(confidence, 2),
        "range": {
            "min": round(estimate_min, 2),
            "max": round(estimate_max, 2),
        },
        "reasoning": f"Heuristic estimate based on {'income, expenses, and ' if profile else ''}known assets/liabilities.",
    }


async def _ai_estimate_net_worth(
    exact: dict,
    profile: Optional[dict],
    expenses: Optional[dict],
) -> Optional[dict]:
    """
    Use Claude Sonnet to estimate net worth from available signals.
    Returns None on failure (graceful degradation).
    """
    # Build context for AI
    context_parts = []

    if profile:
        age_info = ""
        if profile.get("date_of_birth"):
            from datetime import date as dt_date
            try:
                dob = dt_date.fromisoformat(profile["date_of_birth"])
                age = (dt_date.today() - dob).days // 365
                age_info = f", age {age}"
            except (ValueError, TypeError):
                pass

        context_parts.append(f"""User Profile:
- Income: ₹{profile.get('monthly_income', 'unknown')}/month{age_info}
- Income type: {profile.get('income_type', 'unknown')}
- Dependents: {profile.get('num_dependents', 0)}
- Housing: {profile.get('housing_status', 'unknown')}
- Investment experience: {profile.get('investment_exp', 'unknown')}
- Has existing loans: {profile.get('has_existing_loans', 'unknown')}
- City: {profile.get('city', 'unknown')}""")

    context_parts.append(f"""Known Financial Data:
- Total known assets: ₹{exact['total_assets']:,.2f} ({exact['asset_count']} items)
- Total known liabilities: ₹{exact['total_liabilities']:,.2f} ({exact['liability_count']} items)
- Known net worth: ₹{exact['net_worth']:,.2f}""")

    if expenses:
        context_parts.append(f"""Recent Expenses (3 months):
- Total: ₹{expenses['total_last_3_months']:,.2f}
- Monthly average: ₹{expenses['monthly_average']:,.2f}
- Transaction count: {expenses['transaction_count']}""")

    # Asset breakdown
    if exact.get("assets"):
        asset_lines = [f"  - {a['name']} ({a['asset_type']}): ₹{float(a.get('current_value', 0)):,.0f}"
                       for a in exact["assets"][:10]]
        context_parts.append("Asset breakdown:\n" + "\n".join(asset_lines))

    if exact.get("liabilities"):
        loan_lines = [f"  - {l['loan_type']}: ₹{float(l.get('principal_outstanding', 0)):,.0f} @ {l.get('interest_rate', 0)}%"
                      for l in exact["liabilities"][:10]]
        context_parts.append("Liability breakdown:\n" + "\n".join(loan_lines))

    prompt = f"""Estimate this user's TOTAL net worth (including assets they may not have listed).

{chr(10).join(context_parts)}

Consider:
- People often don't list all assets (savings accounts, small investments, household items)
- Income level and age suggest likely savings
- Housing status hints at property ownership
- Investment experience hints at portfolio size

Return ONLY JSON:
{{
  "estimated_net_worth": <number>,
  "confidence": <float 0-1>,
  "range": {{ "min": <number>, "max": <number> }},
  "reasoning": "<brief 1-2 sentence explanation>"
}}"""

    try:
        client = _get_anthropic_client()
        response = client.messages.create(
            model=SONNET_MODEL,
            max_tokens=300,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()
        result = json.loads(raw_text)
        logger.info("AI net worth estimate: ₹%.2f (confidence: %.2f)",
                     result.get("estimated_net_worth", 0), result.get("confidence", 0))
        return result
    except Exception as e:
        logger.error("AI net worth estimation failed: %s", e)
        return None


async def get_net_worth_summary(user_id: str) -> dict:
    """
    Full net worth summary: exact + approximate.
    """
    exact = await calculate_exact_net_worth(user_id)
    approx = await estimate_net_worth(user_id)

    return {
        "total_assets": exact["total_assets"],
        "total_liabilities": exact["total_liabilities"],
        "net_worth": exact["net_worth"],
        "approx_net_worth": approx.get("estimated_net_worth"),
        "approx_confidence": approx.get("confidence"),
        "approx_range": approx.get("range"),
        "approx_reasoning": approx.get("reasoning"),
        "debt_ratio": exact["debt_ratio"],
        "asset_count": exact["asset_count"],
        "liability_count": exact["liability_count"],
    }


async def get_net_worth_timeline(user_id: str, years: int = 10) -> dict:
    """
    Project net worth over time.
    Assets grow at their respective rates; liabilities decrease via EMI amortization.
    """
    exact = await calculate_exact_net_worth(user_id)
    assets = exact.get("assets", [])
    liabilities = exact.get("liabilities", [])

    timeline = []
    for year in range(0, years + 1):
        # Project each asset
        total_assets_projected = 0
        for a in assets:
            cv = float(a.get("current_value", 0) or a.get("purchase_price", 0) or 0)
            rate = float(a.get("appreciation_rate", 0) or GROWTH_RATES.get(a.get("asset_type", "other"), 0.05))
            projected = cv * ((1 + rate) ** year)
            total_assets_projected += projected

        # Project each liability (simple principal reduction via EMI)
        total_liabilities_projected = 0
        for l in liabilities:
            outstanding = float(l.get("principal_outstanding", 0))
            emi = float(l.get("emi_amount", 0))
            rate_monthly = float(l.get("interest_rate", 0)) / 100 / 12
            remaining = int(l.get("emis_remaining", 0))

            # Simulate year months of payments
            current_principal = outstanding
            for month in range(min(year * 12, remaining)):
                interest = current_principal * rate_monthly
                principal_payment = max(0, emi - interest)
                current_principal = max(0, current_principal - principal_payment)

            total_liabilities_projected += current_principal

        timeline.append({
            "year": year,
            "total_assets": round(total_assets_projected, 2),
            "total_liabilities": round(total_liabilities_projected, 2),
            "net_worth": round(total_assets_projected - total_liabilities_projected, 2),
        })

    summary = await get_net_worth_summary(user_id)

    return {
        "current": summary,
        "timeline": timeline,
    }
