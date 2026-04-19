"""AI-driven budget generation with strict JSON validation and fallback rules."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

import anthropic
from pydantic import BaseModel, Field, ValidationError

from services.rent_scraper import get_rent_estimate

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-6"


class BudgetInput(BaseModel):
    """Input payload for budget generation."""

    income: float = Field(..., gt=0)
    location: str = Field(..., min_length=1)
    dependents: int = Field(..., ge=0)
    housing_status: str = Field(default="rented")
    marital_status: str = Field(default="single")
    income_type: str = Field(default="salaried")
    loans: list[dict[str, Any]] = Field(default_factory=list)
    assets: list[dict[str, Any]] = Field(default_factory=list)


DEBT_HEAVY_EMI_RATIO = 0.40

class BudgetOutput(BaseModel):
    """Strict output schema — 5 sections returned by Claude."""

    needs: dict[str, float]
    wants: dict[str, float]
    investments: dict[str, float]
    emergency: float
    repayment: dict[str, float]
    insights: list[str]
    is_debt_heavy: bool = False


def _sum_values(values: dict[str, float]) -> float:
    return sum(float(v) for v in values.values())


def _clean_positive_dict(values: dict[str, Any]) -> dict[str, float]:
    cleaned: dict[str, float] = {}
    for key, value in values.items():
        try:
            parsed = round(max(float(value), 0.0), 2)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            cleaned[key] = parsed
    return cleaned


def _normalize_to_income(
    result: dict[str, Any],
    income: float,
    repayment_dict: dict[str, float],
    is_renter: bool,
    rent_value: float,
    is_debt_heavy: bool = False,
) -> dict[str, Any]:
    """Force final budget to stay within income while keeping repayment fixed."""
    repayment = _clean_positive_dict(repayment_dict)
    repayment_total = _sum_values(repayment)
    available = max(float(income) - repayment_total, 0.0)

    needs = _clean_positive_dict(result.get("needs", {}) if isinstance(result.get("needs"), dict) else {})
    wants = _clean_positive_dict(result.get("wants", {}) if isinstance(result.get("wants"), dict) else {})

    if is_debt_heavy:
        investments = {}
        emergency = 0.0
    else:
        investments = _clean_positive_dict(
            result.get("investments", {}) if isinstance(result.get("investments"), dict) else {}
        )
        try:
            emergency = round(max(float(result.get("emergency", 0.0)), 0.0), 2)
        except (TypeError, ValueError):
            emergency = 0.0

    if is_renter and available > 0:
        # Keep rent realistic but never let it consume the entire non-EMI budget.
        rent_cap = available * 0.60
        normalized_rent = round(min(float(int(round(rent_value))), rent_cap), 2)
        if normalized_rent > 0:
            needs["rent"] = normalized_rent
        else:
            needs.pop("rent", None)
    elif not is_renter:
        needs.pop("rent", None)

    current_total = _sum_values(needs) + _sum_values(wants) + _sum_values(investments) + emergency

    if available <= 0:
        needs = {"rent": 0.0} if is_renter else {}
        wants = {}
        investments = {}
        emergency = 0.0
    elif current_total > 0:
        scale = available / current_total

        needs = {k: round(v * scale, 2) for k, v in needs.items() if round(v * scale, 2) > 0}
        wants = {k: round(v * scale, 2) for k, v in wants.items() if round(v * scale, 2) > 0}
        investments = {
            k: round(v * scale, 2) for k, v in investments.items() if round(v * scale, 2) > 0
        }
        emergency = round(max(emergency * scale, 0.0), 2)

        # Correct rounding drift to match available income exactly (or as close as cents allow).
        after_scale_total = _sum_values(needs) + _sum_values(wants) + _sum_values(investments) + emergency
        delta = round(available - after_scale_total, 2)
        if abs(delta) > 0:
            emergency = round(max(emergency + delta, 0.0), 2)
    else:
        emergency = round(available, 2)

    normalized = {
        "needs": needs,
        "wants": wants,
        "investments": investments,
        "emergency": emergency,
        "repayment": repayment,
        "insights": result.get("insights") if isinstance(result.get("insights"), list) else [],
        "is_debt_heavy": is_debt_heavy,
    }

    non_repayment_total = (
        _sum_values(normalized["needs"])
        + _sum_values(normalized["wants"])
        + _sum_values(normalized["investments"])
        + float(normalized["emergency"])
    )
    overage = round(non_repayment_total - available, 2)
    if overage > 0:
        # Remove tiny rounding overages deterministically.
        if normalized["emergency"] > 0:
            normalized["emergency"] = round(max(float(normalized["emergency"]) - overage, 0.0), 2)
            overage = round(
                (
                    _sum_values(normalized["needs"])
                    + _sum_values(normalized["wants"])
                    + _sum_values(normalized["investments"])
                    + float(normalized["emergency"])
                )
                - available,
                2,
            )

        if overage > 0:
            for section_name in ("investments", "wants", "needs"):
                section = normalized[section_name]
                for key in list(section.keys()):
                    if overage <= 0:
                        break
                    reduction = min(section[key], overage)
                    section[key] = round(max(section[key] - reduction, 0.0), 2)
                    overage = round(overage - reduction, 2)
                    if section[key] <= 0:
                        section.pop(key, None)
                if overage <= 0:
                    break

    return BudgetOutput.model_validate(normalized).model_dump()


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)


def _extract_total_emi(loans: list[dict[str, Any]]) -> float:
    total = 0.0
    emi_keys = (
        "emi",
        "emi_amount",
        "monthly_emi",
        "monthly_payment",
        "payment",
    )
    for loan in loans:
        for key in emi_keys:
            if key in loan:
                try:
                    total += abs(float(loan[key]))
                except (TypeError, ValueError):
                    pass
                break
    return total


def _build_repayment_dict(loans: list[dict[str, Any]]) -> dict[str, float]:
    """Build a per-loan repayment dict from user's loan data."""
    repayment: dict[str, float] = {}
    emi_keys = ("emi", "emi_amount", "monthly_emi", "monthly_payment", "payment")

    for i, loan in enumerate(loans):
        emi_value = 0.0
        for key in emi_keys:
            if key in loan:
                try:
                    emi_value = abs(float(loan[key]))
                except (TypeError, ValueError):
                    pass
                break

        if emi_value <= 0:
            continue

        # Build a readable key from loan type or name
        loan_type = (
            loan.get("loan_type")
            or loan.get("type")
            or loan.get("name")
            or f"loan_{i + 1}"
        )
        safe_key = str(loan_type).lower().replace(" ", "_").replace("-", "_") + "_emi"
        repayment[safe_key] = round(emi_value, 2)

    return repayment


def _extract_json_block(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[1] if "\n" in stripped else stripped
        if stripped.endswith("```"):
            stripped = stripped[:-3].strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in Claude response")

    return json.loads(stripped[start : end + 1])


async def _call_claude_budget_json(
    payload: BudgetInput,
    recommended_bhk: str,
    rent_value: float,
    emi_ratio: float,
    total_emi: float,
    repayment_dict: dict[str, float],
    anthropic_client: anthropic.Anthropic | None = None,
) -> dict[str, Any]:
    client = anthropic_client or _get_client()

    housing = payload.housing_status.lower()
    is_renter = housing == "rented"
    has_dependents = payload.dependents > 0
    is_married = payload.marital_status.lower() in ("married",)

    # ── Needs categories (context-aware) ──
    needs_categories: list[str] = []
    if is_renter:
        needs_categories.append(f'"rent": {int(round(rent_value))} (MUST be exactly this value)')
    needs_categories.extend([
        '"groceries": number (monthly grocery/food spending)',
        '"commute": number (fuel, public transport, cab)',
        '"bills_and_utilities": number (electricity, water, gas, internet, phone)',
        '"healthcare": number (medical, medicines, checkups)',
        '"insurance": number (health/life/vehicle premiums)',
    ])
    if has_dependents:
        needs_categories.append('"family_expenses": number (school fees, childcare, family needs)')
    if is_married or has_dependents:
        needs_categories.append('"remittances": number (family support, money sent to relatives)')

    # ── Wants categories ──
    wants_categories = [
        '"dining_out": number (restaurants, cafes, ordering in)',
        '"entertainment": number (movies, streaming, events, hobbies)',
        '"shopping": number (clothing, gadgets, non-essentials)',
        '"subscriptions": number (OTT, gym, magazines, apps)',
        '"personal_care": number (grooming, salon, skincare)',
        '"travel": number (weekend trips, vacation savings)',
    ]
    if has_dependents:
        wants_categories.append('"family_activities": number (outings, toys, family fun)')

    # ── Investment categories ──
    investments_categories = [
        '"mutual_funds": number (SIP or lumpsum into equity/debt funds)',
        '"ppf_epf": number (provident fund, NPS contributions)',
        '"stocks": number (direct equity trading)',
        '"fixed_deposits": number (FD, RD, bonds)',
    ]
    if payload.income_type.lower() in ("business", "freelance"):
        investments_categories.append('"gold_savings": number (digital gold, SGBs)')

    # ── Repayment (fixed from loan data) ──
    repayment_block = ""
    if repayment_dict:
        repayment_lines = ", ".join(
            f'"{k}": {v}' for k, v in repayment_dict.items()
        )
        repayment_block = f'"repayment": {{ {repayment_lines} }} (these are FIXED EMI values — do NOT change them)'
    else:
        repayment_block = '"repayment": {} (user has no loans)'

    needs_schema = ",\n    ".join(needs_categories)
    wants_schema = ",\n    ".join(wants_categories)
    investments_schema = ",\n    ".join(investments_categories)

    # ── Context notes ──
    context_notes = []
    if not is_renter:
        context_notes.append(f"User OWNS their home (housing_status={housing}). Do NOT include rent in needs.")
    else:
        context_notes.append(f"User RENTS their home. Rent MUST be exactly {int(round(rent_value))} INR.")
    if has_dependents:
        context_notes.append(f"User has {payload.dependents} dependent(s). Include family_expenses and family_activities.")
    if is_married:
        context_notes.append("User is married. Budget should account for a two-person household.")
    context_notes.append(f"Income type: {payload.income_type}.")
    if total_emi > 0:
        context_notes.append(f"Total monthly EMI: {int(round(total_emi))} INR (EMI-to-income ratio: {emi_ratio:.1%}).")
        context_notes.append("Repayment values are FIXED from existing loan data — do not alter them.")
    else:
        context_notes.append("User has no active loans. Repayment section should be empty dict {{}}.")

    context_block = "\n".join(f"- {note}" for note in context_notes)

    # ── Available income after EMI ──
    available_income = payload.income - total_emi
    is_debt_heavy = emi_ratio >= DEBT_HEAVY_EMI_RATIO

    if is_debt_heavy:
        context_notes.append(
            f"CRITICAL: EMI-to-income ratio is {emi_ratio:.0%} (≥40%). "
            "This user is debt-heavy. Do NOT allocate anything to investments or emergency savings. "
            'Set "investments" to {{}} and "emergency" to 0. '
            "Distribute all available income only between needs and wants."
        )

    prompt = f"""
You are a personal finance assistant for India.
Create a detailed, context-aware monthly budget allocating the user's income across 5 sections.

User input:
{payload.model_dump_json(indent=2)}

Derived constraints:
- recommended_bhk: {recommended_bhk}
- monthly_rent_estimate: {int(round(rent_value))}
- total_monthly_emi: {int(round(total_emi))}
- emi_to_income_ratio: {emi_ratio:.4f}
- available_income_after_emi: {int(round(available_income))}

Context-aware notes:
{context_block}

BUDGET ALLOCATION RULES:
1. Repayment EMIs are FIXED and already known: {json.dumps(repayment_dict)}
2. The remaining {int(round(available_income))} INR should be split across needs, wants, investments, and emergency.
3. Use approximate 50/30/15/5 ratio for needs/wants/investments/emergency from the available income (after EMI).
4. Adjust ratios intelligently based on income level and profile.

IMPORTANT OUTPUT RULES:
- Return ONLY valid JSON. No markdown, no extra text.
- "needs" must be a dict with ONLY these keys (include all that apply):
  {{
    {needs_schema}
  }}
- "wants" must be a dict with ONLY these keys (include all):
  {{
    {wants_schema}
  }}
- "investments" must be a dict with ONLY these keys (include all that apply):
  {{
    {investments_schema}
  }}
- {repayment_block}
- "emergency" must be a single number (monthly emergency fund contribution).
- Every category MUST have a value > 0 (except repayment which is fixed).
- All numbers must be monthly amounts in INR.
- The sum of all sections (needs + wants + investments + emergency + repayment) MUST approximately equal the user's total income of {int(round(payload.income))} INR.
- insights must be 2-4 concise, actionable tips personalized to this user's situation.

Output schema:
{{
  "needs": {{...}},
  "wants": {{...}},
  "investments": {{...}},
  "emergency": number,
  "repayment": {{...}},
  "insights": ["string", ...]
}}
""".strip()

    def _invoke() -> anthropic.types.Message:
        return client.messages.create(
            model=SONNET_MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )

    response = await asyncio.to_thread(_invoke)

    text_blocks = [getattr(block, "text", "") for block in response.content]
    raw_text = "\n".join(part for part in text_blocks if part)
    parsed = _extract_json_block(raw_text)

    # Force repayment to match actual loan data
    parsed["repayment"] = repayment_dict

    validated = BudgetOutput.model_validate(parsed)
    result = validated.model_dump()

    return _normalize_to_income(
        result=result,
        income=payload.income,
        repayment_dict=repayment_dict,
        is_renter=is_renter,
        rent_value=rent_value,
        is_debt_heavy=is_debt_heavy,
    )


def _fallback_budget(
    payload: BudgetInput,
    recommended_bhk: str,
    rent_value: float,
    emi_ratio: float,
    total_emi: float,
    repayment_dict: dict[str, float],
) -> dict[str, Any]:
    income = float(payload.income)
    available = max(income - total_emi, 0.0)
    is_debt_heavy = emi_ratio >= DEBT_HEAVY_EMI_RATIO

    if is_debt_heavy:
        needs_total = available * 0.60
        wants_total = available * 0.40
        invest_total = 0.0
        emergency = 0.0
    else:
        needs_total = available * 0.50
        wants_total = available * 0.30
        invest_total = available * 0.15
        emergency = round(max(available * 0.05, 0.0), 2)

    housing = payload.housing_status.lower()
    is_renter = housing == "rented"
    has_dependents = payload.dependents > 0
    is_married = payload.marital_status.lower() in ("married",)

    # ── Needs ──
    needs: dict[str, float] = {}
    if is_renter:
        # Cap rent to at most 60% of needs_total to avoid starving other categories
        capped_rent = min(float(int(round(rent_value))), needs_total * 0.60) if needs_total > 0 else 0.0
        needs["rent"] = round(capped_rent, 2)
    remaining_needs = max(needs_total - needs.get("rent", 0.0), 0.0)

    needs["groceries"] = round(remaining_needs * 0.28, 2)
    needs["commute"] = round(remaining_needs * 0.15, 2)
    needs["bills_and_utilities"] = round(remaining_needs * 0.18, 2)
    needs["healthcare"] = round(remaining_needs * 0.10, 2)
    needs["insurance"] = round(remaining_needs * 0.10, 2)
    if has_dependents:
        needs["family_expenses"] = round(remaining_needs * 0.12, 2)
    if is_married or has_dependents:
        needs["remittances"] = round(remaining_needs * 0.07, 2)

    # ── Wants ──
    wants: dict[str, float] = {
        "dining_out": round(wants_total * 0.25, 2),
        "entertainment": round(wants_total * 0.15, 2),
        "shopping": round(wants_total * 0.20, 2),
        "subscriptions": round(wants_total * 0.10, 2),
        "personal_care": round(wants_total * 0.10, 2),
        "travel": round(wants_total * 0.15, 2),
    }
    if has_dependents:
        wants["family_activities"] = round(wants_total * 0.05, 2)

    # ── Investments ──
    if is_debt_heavy:
        investments = {}
    elif payload.income_type.lower() in ("business", "freelance"):
        investments = {
            "mutual_funds": round(invest_total * 0.35, 2),
            "ppf_epf": round(invest_total * 0.20, 2),
            "stocks": round(invest_total * 0.20, 2),
            "fixed_deposits": round(invest_total * 0.15, 2),
            "gold_savings": round(invest_total * 0.10, 2),
        }
    else:
        investments = {
            "mutual_funds": round(invest_total * 0.40, 2),
            "ppf_epf": round(invest_total * 0.25, 2),
            "stocks": round(invest_total * 0.20, 2),
            "fixed_deposits": round(invest_total * 0.15, 2),
        }

    insights = [
        "This budget uses a rule-based allocation due to AI fallback.",
        f"Recommended housing size is {recommended_bhk} for {payload.dependents} dependents.",
    ]
    if total_emi > 0:
        insights.append(
            f"EMI-to-income ratio is {emi_ratio:.0%}. "
            + ("Your loan burden is high — focus on repayment before investing." if is_debt_heavy else "Your EMI load is manageable.")
        )

    output = BudgetOutput(
        needs=needs,
        wants=wants,
        investments=investments,
        emergency=emergency,
        repayment=repayment_dict,
        insights=insights,
        is_debt_heavy=is_debt_heavy,
    )
    return _normalize_to_income(
        result=output.model_dump(),
        income=income,
        repayment_dict=repayment_dict,
        is_renter=is_renter,
        rent_value=rent_value,
        is_debt_heavy=is_debt_heavy,
    )


async def generate_budget_plan(
    payload: BudgetInput,
    anthropic_client: anthropic.Anthropic | None = None,
) -> dict[str, Any]:
    """
    Generate a monthly budget from user context.

    Attempts Claude Sonnet first with strict JSON validation.
    Falls back to a deterministic rule-based budget if Claude fails.
    """
    try:
        rent_data = await get_rent_estimate(payload.location, payload.dependents)
        recommended_bhk = str(rent_data["recommended_bhk"])
        rent_value = float(rent_data["avg_rent"])

        total_emi = _extract_total_emi(payload.loans)
        emi_ratio = (total_emi / payload.income) if payload.income > 0 else 0.0
        repayment_dict = _build_repayment_dict(payload.loans)

        try:
            return await _call_claude_budget_json(
                payload=payload,
                recommended_bhk=recommended_bhk,
                rent_value=rent_value,
                emi_ratio=emi_ratio,
                total_emi=total_emi,
                repayment_dict=repayment_dict,
                anthropic_client=anthropic_client,
            )
        except (ValidationError, ValueError, json.JSONDecodeError, RuntimeError) as exc:
            logger.warning("Budget AI response invalid, using fallback: %s", exc)
            return _fallback_budget(
                payload=payload,
                recommended_bhk=recommended_bhk,
                rent_value=rent_value,
                emi_ratio=emi_ratio,
                total_emi=total_emi,
                repayment_dict=repayment_dict,
            )
        except Exception as exc:
            logger.error("Budget AI call failed, using fallback: %s", exc)
            return _fallback_budget(
                payload=payload,
                recommended_bhk=recommended_bhk,
                rent_value=rent_value,
                emi_ratio=emi_ratio,
                total_emi=total_emi,
                repayment_dict=repayment_dict,
            )
    except Exception as exc:
        logger.error("Budget generation failed, returning minimal fallback: %s", exc)
        safe_payload = BudgetInput(
            income=max(float(payload.income), 1.0),
            location=payload.location or "Unknown",
            dependents=max(int(payload.dependents), 0),
            housing_status=payload.housing_status,
            marital_status=payload.marital_status,
            income_type=payload.income_type,
            loans=payload.loans,
            assets=payload.assets,
        )
        default_rent_data = await get_rent_estimate(safe_payload.location, safe_payload.dependents)
        total_emi = _extract_total_emi(safe_payload.loans)
        emi_ratio = total_emi / safe_payload.income if safe_payload.income > 0 else 0.0
        repayment_dict = _build_repayment_dict(safe_payload.loans)
        return _fallback_budget(
            payload=safe_payload,
            recommended_bhk=str(default_rent_data["recommended_bhk"]),
            rent_value=float(default_rent_data["avg_rent"]),
            emi_ratio=emi_ratio,
            total_emi=total_emi,
            repayment_dict=repayment_dict,
        )