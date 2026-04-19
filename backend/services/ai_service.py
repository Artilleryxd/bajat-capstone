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

SONNET_MODEL = "claude-sonnet-4-6"
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
    loans_info: Optional[list[dict]] = None,
) -> Optional[str]:
    """
    Generate a plain-language, per-loan action plan for the chosen repayment strategy.

    loans_info: list of {loan_type, lender, rate, balance, emi, closes_at_month, interest_paid}
                sorted in payoff priority order (first to close first).

    Returns None on failure — callers must handle graceful degradation.
    Never raises; exceptions are caught and logged.
    """
    invest_signal = monthly_surplus > (total_emi * 2) and highest_rate < 10.0
    refinance_signal = highest_rate > 12.0

    if loans_info:
        steps = "\n".join(
            f"  Step {i + 1}: {li['loan_type']}"
            + (f" via {li['lender']}" if li.get("lender") else "")
            + f" — {currency} {li['balance']:,.0f} at {li['rate']:.1f}% p.a."
            + f" | EMI {currency} {li['emi']:,.0f}/mo"
            + f" | Closes in ~{li['closes_at_month']} months"
            + f" | Interest cost: {currency} {li['interest_paid']:,.0f}"
            for i, li in enumerate(loans_info)
        )
        loan_context = f"""
REPAYMENT PLAN (priority order — first loan to close listed first):
{steps}

The cascade: when each loan closes its freed EMI is redirected to the next loan, accelerating payoff.
"""
    else:
        loan_context = ""

    prompt = f"""You are FinSight, a personal finance advisor. Write a specific, actionable loan repayment plan in exactly 3 paragraphs.
{loan_context}
Strategy: {best_strategy}
Total interest saved vs paying only minimum EMIs: {currency} {total_saved:,.0f}
Months saved vs paying only minimum EMIs: {months_saved}
Monthly surplus after all EMIs: {currency} {monthly_surplus:,.0f}
Highest interest rate in portfolio: {highest_rate:.1f}%
{("Avalanche vs snowball interest difference: " + currency + " " + f"{interest_diff:,.0f}" + f" ({months_diff} months)") if interest_diff > 0 else ""}
{("Highest rate > 12% — a brief refinancing mention is appropriate." if refinance_signal else "")}
{("Good surplus and sub-10% rates — briefly note what freed EMIs could do once all debt is cleared." if invest_signal else "")}
{("No surplus — all income goes to EMIs. Suggest ways to create even a small surplus." if monthly_surplus == 0 else "")}

Write exactly 3 paragraphs:
1. WHY THIS ORDER: explain which loan is tackled first and why given its rate/balance, referencing the specific loans by type. If avalanche, explain highest-rate = most expensive. If snowball, explain smallest balance = fastest psychological win.
2. THE CASCADE EFFECT: walk through the payoff sequence — when the first loan closes, its freed EMI boosts the next loan. Give specific months/dates where possible. Make the snowball/avalanche cascade feel concrete and exciting.
3. THE FINISH LINE: give the total interest saved ({currency} {total_saved:,.0f}), when the user will be completely debt-free, and what those freed EMIs could accomplish financially once all debt is cleared.

RULES:
- Reference loans by type ("your Personal Loan", "the Car Loan") not generic "a loan"
- Use specific numbers from the plan
- Never name specific funds, banks, or tax instruments
- No jargon — plain language, encouraging tone
- 3–4 sentences per paragraph, no more"""

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
    budget_investment_allocation: Optional[float] = None,
    payout_date: Optional[str] = None,
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
        if payout_date:
            goal_section += f"- Target Date to Reach Goal: {payout_date}\n"

    budget_sip_display = f"{currency} {budget_investment_allocation:,.0f}" if budget_investment_allocation else "not yet set"
    goal_display = f"{currency} {goal_amount:,.0f}" if goal_amount else "not set"
    target_date_display = payout_date or "no target date set"

    budget_sip_section = ""
    if budget_investment_allocation is not None:
        budget_sip_section = (
            f"\nBUDGET-DERIVED SIP:\n"
            f"- The user's AI-generated monthly budget allocates {currency} {budget_investment_allocation:,.0f} to investments.\n"
            f"- This is the actual amount the user can invest each month based on their income and expenses.\n"
        )

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
{goal_section}{budget_sip_section}{portfolio_section}
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
  "ai_insights": "4–5 plain-English paragraphs: (1) overall strategy summary, (2) how the allocation fits the user's life stage and goals, (3) GOAL REACHABILITY — if a goal and target date are given, explicitly state whether the budget SIP of {budget_sip_display} per month is sufficient to reach the goal of {goal_display} by {target_date_display} — if not, state exactly how much more is needed and suggest concrete steps (cut wants, increase income, extend timeline), (4) what the user should do next month concretely, (5) one risk or caveat to watch.",
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


def generate_health_score(
    monthly_income: float,
    monthly_expenses: float | None,
    net_worth: float | None,
    total_assets: float | None,
    total_liabilities: float | None,
    debt_ratio: float | None,
    loan_count: int,
    total_emi: float,
    has_investment_strategy: bool,
    is_debt_heavy: bool,
    currency: str = "INR",
) -> dict | None:
    """
    Ask Claude to compute a financial health score (0–100) with a one-line label
    and a brief 2-sentence rationale.

    Returns {"score": int, "label": str, "rationale": str} or None on failure.
    """
    import json as _json

    ctx_parts = [
        f"Monthly income: {currency} {monthly_income:,.0f}",
        f"Monthly expenses: {currency} {monthly_expenses:,.0f}" if monthly_expenses else "Monthly expenses: unknown",
        f"Net worth: {currency} {net_worth:,.0f}" if net_worth is not None else "Net worth: unknown",
        f"Total assets: {currency} {total_assets:,.0f}" if total_assets is not None else "Total assets: unknown",
        f"Total liabilities: {currency} {total_liabilities:,.0f}" if total_liabilities is not None else "Total liabilities: unknown",
        f"Debt ratio: {debt_ratio:.1f}%" if debt_ratio is not None else "Debt ratio: unknown",
        f"Active loans: {loan_count}",
        f"Total monthly EMI: {currency} {total_emi:,.0f}",
        f"Has investment strategy: {'yes' if has_investment_strategy else 'no'}",
        f"Debt-heavy mode: {'yes' if is_debt_heavy else 'no'}",
    ]
    context = "\n".join(ctx_parts)

    prompt = f"""You are FinSight, a financial wellness advisor. Given the following financial snapshot, compute a financial health score from 0 to 100 and a brief assessment.

Scoring guidelines (these are suggestions — apply your own judgement):
- Savings rate (income minus expenses as % of income): 20%+ is healthy, <10% is poor
- Debt ratio (liabilities / assets): <20% excellent, 20–35% good, 35–50% moderate, >50% poor
- EMI-to-income ratio: <30% healthy, >40% stressed
- Investment activity: having a strategy adds to score
- No active loans is a positive signal
- Never award 100 — a perfect score is unreachable; top scores should be 88–95 for genuinely excellent profiles

User's financial snapshot:
{context}

Respond ONLY with valid JSON in this exact format:
{{"score": 82, "label": "Very Good", "rationale": "Your debt ratio is low and savings rate is healthy. Continuing SIP investments will strengthen your long-term position."}}

No markdown, no extra keys, no explanation outside the JSON."""

    try:
        client = _get_client()
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = _json.loads(raw)
        return {
            "score": max(0, min(100, int(data["score"]))),
            "label": str(data.get("label", "")),
            "rationale": str(data.get("rationale", "")),
        }
    except Exception as e:
        logger.error("Health score generation failed: %s", e)
        return None
