# backend/services/ai_service.py
"""
Single entry point for all Anthropic API calls in FinSight.
- Use SONNET_MODEL for reasoning tasks (loan optimization, budget planning, chat).
- Use HAIKU_MODEL for classification tasks (expense categorization, column mapping).
Never call anthropic.Anthropic() outside this file.
"""
import logging
import os
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-20250514"
HAIKU_MODEL = "claude-haiku-4-5-20251001"


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)


def generate_loan_explanation(
    best_strategy: str,
    total_saved: float,
    months_saved: int,
    highest_rate: float,
    monthly_surplus: float,
    total_emi: float,
    currency: str = "INR",
    interest_diff: float = 0.0,
    months_diff: int = 0,
    optimization_mode: str = "cost_time_weighted",
    avalanche_score: float = 0.0,
    snowball_score: float = 0.0,
) -> Optional[str]:
    """
    Generate a plain-language explanation of the chosen loan repayment strategy.

    Returns None on failure — callers must handle graceful degradation.
    Never raises; exceptions are caught and logged.
    """
    invest_signal = monthly_surplus > (total_emi * 2) and highest_rate < 10.0
    refinance_signal = highest_rate > 12.0

    prompt = f"""You are FinSight, a personal finance advisor. Explain the following loan repayment strategy recommendation in 3–4 concise paragraphs.

Strategy chosen: {best_strategy}
Optimization mode: {optimization_mode} (weighted for both total interest and closure time)
Strategy score (lower is better): avalanche={avalanche_score:.4f}, snowball={snowball_score:.4f}
Interest saved vs just paying minimum EMIs: {currency} {total_saved:,.2f}
Months saved vs just paying minimum EMIs: {months_saved}
Difference between avalanche and snowball interest: {currency} {interest_diff:,.2f}
Difference between avalanche and snowball months: {months_diff}
Highest loan interest rate: {highest_rate:.2f}%
Monthly surplus after all EMIs: {currency} {monthly_surplus:,.2f}
{("Note: The user has a large monthly surplus and relatively low loan rates. Briefly address whether allocating some surplus to investments might be worth considering (without naming specific instruments)." if invest_signal else "")}
{("Note: The highest interest rate exceeds 12%. Briefly mention that refinancing at a lower rate could reduce costs, without naming specific lenders." if refinance_signal else "")}
{("Note: The user has no monthly surplus — all income goes to EMIs. Suggest ways to create surplus (side income, expense reduction, bonus allocation) so the strategy can work effectively." if monthly_surplus == 0 else "")}

RULES:
- NEVER name specific stocks, mutual funds, ETFs, lenders, or tax instruments
- NEVER give tax advice
- Explain clearly why this strategy was chosen over the alternative
- Explicitly mention that strategy selection balances both cost and payoff time
- Mention concrete numbers: interest saved, months saved, and the difference between strategies
- If surplus is 0, explain that both strategies produce similar results without extra payments, and emphasize the importance of creating even a small surplus
- Be encouraging and plain-language — no jargon
- Maximum 4 paragraphs"""

    try:
        client = _get_client()
        response = client.messages.create(
            model=SONNET_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error("AI loan explanation failed: %s", e)
        return None


def generate_investment_strategy_ai(
    risk_score: int,
    risk_profile: str,
    monthly_income: float,
    investable_surplus: float,
    income_type: Optional[str],
    num_dependents: int,
    housing_status: Optional[str],
    investment_exp: Optional[str],
    time_horizon: str,
    is_debt_heavy: bool,
    dti_ratio: float,
    total_emi: float,
    currency: str,
    goal_amount: Optional[float],
    current_portfolio_value: Optional[float],
    portfolio_text: Optional[str],
) -> Optional[dict]:
    """
    Generate investment strategy allocations, risk explanation, and AI insights.

    Returns a dict with keys:
        risk_explanation, allocations, ai_insights, debt_warning,
        estimated_annual_return
    Returns None on failure — callers handle graceful degradation.
    Never raises.
    """
    goal_section = ""
    if goal_amount:
        goal_section = f"- Investment Goal: {currency} {goal_amount:,.0f}\n"
        if current_portfolio_value:
            goal_section += f"- Current Portfolio Value: {currency} {current_portfolio_value:,.0f}\n"

    portfolio_section = ""
    if portfolio_text:
        portfolio_section = f"\nCurrent Portfolio Description:\n{portfolio_text}\n"

    debt_note = ""
    if is_debt_heavy:
        debt_note = (
            f"IMPORTANT: User is debt-heavy — DTI ratio is {dti_ratio:.0%}. "
            "Their total EMI burden consumes a large share of income. "
            "The strategy should strongly recommend focusing on debt closure first. "
            "Keep equity allocations very conservative or minimal."
        )

    time_horizon_labels = {
        "short": "Short-term (1–3 years)",
        "medium": "Medium-term (3–7 years)",
        "long": "Long-term (7–15 years)",
        "retirement": "Retirement (15+ years)",
    }
    horizon_label = time_horizon_labels.get(time_horizon, time_horizon)

    prompt = f"""You are FinSight, a personal finance AI advisor for Indian users.
Generate a personalised investment strategy for the following user profile.

USER PROFILE:
- Risk Score: {risk_score}/100 ({risk_profile})
- Monthly Income: {currency} {monthly_income:,.0f}
- Investable Monthly Surplus: {currency} {investable_surplus:,.0f}
- Income Type: {income_type or "not specified"}
- Dependents: {num_dependents}
- Housing: {housing_status or "not specified"}
- Investment Experience: {investment_exp or "beginner"}
- Investment Time Horizon: {horizon_label}
- Total Monthly EMI: {currency} {total_emi:,.0f}
- Debt-to-Income Ratio: {dti_ratio:.0%}
{goal_section}{portfolio_section}
{debt_note}

Return ONLY a valid JSON object — no markdown fences, no commentary outside the JSON.
Use this exact structure:

{{
  "risk_explanation": "2–3 sentences explaining why this risk score was assigned based on the user's age, income, dependents, debt load, and experience.",
  "allocations": [
    {{
      "name": "Large Cap Equity",
      "percentage": 35,
      "color": "#3B82F6",
      "rationale": "One sentence rationale."
    }}
  ],
  "ai_insights": "3–4 plain-English paragraphs covering: (1) overall strategy summary, (2) how the allocation fits the user's life stage and goals, (3) what the user should do next month concretely, (4) one risk or caveat to watch.",
  "debt_warning": "2–3 sentences explaining the user should close high-interest loans before investing aggressively — or null if not debt-heavy.",
  "estimated_annual_return": 10.5
}}

STRICT RULES:
- allocations percentages MUST sum to exactly 100
- NEVER name specific mutual funds, stocks, ETFs, insurance plans, or lenders
- Only recommend broad asset CLASSES (e.g. Large Cap Equity, Mid Cap Equity, Small Cap Equity, Bonds & Debt, Gold, International Equity, Liquid/Emergency Fund)
- Use these hex colors by asset class:
    Large Cap Equity → #3B82F6
    Mid Cap Equity   → #22C55E
    Small Cap Equity → #F59E0B
    Bonds & Debt     → #8B5CF6
    Gold             → #F97316
    International    → #EC4899
    Liquid/Emergency → #6B7280
    Flexi/Multi Cap  → #14B8A6
- debt_warning must be null (JSON null) if is_debt_heavy is false
- estimated_annual_return should reflect the weighted expected return of the recommended portfolio
- ai_insights must be plain English paragraphs — no bullet points, no headers
- If investable_surplus is 0 or negative, acknowledge that fact and recommend building surplus before investing"""

    try:
        import json as _json
        client = _get_client()
        response = client.messages.create(
            model=SONNET_MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = _json.loads(raw)

        # Normalise allocation percentages to exactly 100
        allocs = result.get("allocations", [])
        total = sum(a.get("percentage", 0) for a in allocs)
        if total > 0 and abs(total - 100) > 0.5:
            for a in allocs:
                a["percentage"] = round(a["percentage"] / total * 100, 1)
            # Fix rounding residual on largest item
            diff = 100 - sum(a["percentage"] for a in allocs)
            if allocs:
                allocs[0]["percentage"] = round(allocs[0]["percentage"] + diff, 1)

        return result

    except Exception as e:
        logger.error("AI investment strategy generation failed: %s", e)
        return None


def parse_portfolio_from_text(portfolio_text: str, currency: str) -> Optional[float]:
    """
    Given a free-text description of a user's current portfolio,
    estimate average annual return %.
    Returns the estimated % as a float, or None on failure.
    """
    prompt = f"""A user describes their current investment portfolio as follows:

\"\"\"{portfolio_text}\"\"\"

Based on this description, estimate the weighted average expected annual return (%) for this portfolio.
Consider: equity funds typically return 10–15% p.a., debt/FD 6–8%, gold 8–10%, liquid funds 5–7%.

Respond with ONLY a JSON object: {{"estimated_return_pct": 10.5}}
No explanation, no markdown. Just the JSON."""

    try:
        import json as _json
        client = _get_client()
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=64,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = _json.loads(raw)
        return float(data.get("estimated_return_pct", 10.0))
    except Exception as e:
        logger.error("Portfolio return estimation failed: %s", e)
        return None
