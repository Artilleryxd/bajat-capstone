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
