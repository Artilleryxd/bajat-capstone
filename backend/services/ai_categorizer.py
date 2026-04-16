"""AI categorization service using Claude Haiku for expense classification."""

import json
import logging
import os
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

HAIKU_MODEL = "claude-haiku-4-5-20251001"


def _get_client() -> anthropic.Anthropic:
    """Create Anthropic client. Reads ANTHROPIC_API_KEY from env."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)


def categorize_expenses_batch(expenses: list[dict]) -> list[dict]:
    """
    Batch-categorize expenses using Claude Haiku.
    
    Each expense dict must have at least: id, description, amount.
    Returns list of dicts with: id, category, subcategory, confidence.
    On failure, returns empty list (graceful degradation).
    """
    if not expenses:
        return []

    prompt = f"""Categorize each transaction into one of these categories: needs, wants, investments, repayments, income.

Definitions:
- needs: Essential living expenses (rent, groceries, utilities, medicine, transport, insurance)
- wants: Non-essential spending, including both everyday treats and luxuries (dining out, streaming, shopping, coffee, travel, gadgets, premium brands, entertainment, subscriptions)
- investments: Financial growth (SIP, stocks, FD, PPF, NPS, mutual funds, crypto)
- repayments: Loan EMI payments, credit card bill payments, debt repayments, home/car/personal loan instalments
- income: Salary credits, deposits, refunds, cashback, interest received, or any money coming IN

Return ONLY a JSON array. No other text, no markdown, no explanation.
Each item must have: "id" (string), "category" (string), "subcategory" (string), "confidence" (float 0-1), "merchant" (string or null)

Transactions:
{json.dumps(expenses, separators=(',', ':'))}"""

    try:
        client = _get_client()
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text.strip()
        # Handle potential markdown wrapping
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()
        result = json.loads(raw_text)
        if isinstance(result, list):
            return result
        logger.warning("AI returned non-list response: %s", type(result))
        return []
    except json.JSONDecodeError as e:
        logger.error("Failed to parse AI categorization response: %s", e)
        return []
    except Exception as e:
        logger.error("AI categorization failed: %s", e)
        return []


def ai_map_columns(headers: list[str]) -> Optional[dict]:
    """
    Use Haiku to map CSV column headers to standardized field names.
    Returns dict like: {"date": "header", "description": "header", "debit": "header", "credit": "header"}
    """
    prompt = f"""These are CSV headers from a bank or expense statement: {json.dumps(headers)}
Map them to these fields. Return ONLY JSON, no other text:
{{ "date": "header_name", "description": "header_name", "debit": "header_name", "credit": "header_name_or_null", "balance": "header_name_or_null" }}

If a header doesn't exist for a field, use null. The "debit" or amount column is required.
If there is a single "amount" column instead of separate debit/credit, map it to "debit"."""

    try:
        client = _get_client()
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()
        return json.loads(raw_text)
    except Exception as e:
        logger.error("AI column mapping failed: %s", e)
        return None


def ai_parse_statement_text(text: str) -> list[dict]:
    """
    Use Haiku to extract transactions from raw text (PDF or OCR).
    Returns list of dicts with: description, amount, date.
    """
    prompt = f"""Extract all EXPENSE transactions from this text. Return ONLY a JSON array, no other text.
Each item: {{ "description": str, "amount": float (positive number), "date": "YYYY-MM-DD" or null }}

Only include actual EXPENSE transactions (purchases, payments, withdrawals, transfers OUT).
DO NOT include income items such as: salary credits, deposits, refunds, cashback, interest received.
Skip headers, totals, and balances.
If you cannot determine the date, use null.

Text:
{text[:3000]}"""

    try:
        client = _get_client()
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()
        result = json.loads(raw_text)
        return result if isinstance(result, list) else []
    except Exception as e:
        logger.error("AI text parsing failed: %s", e)
        return []


def ai_extract_receipt(text: str) -> Optional[dict]:
    """
    Use Haiku to extract structured data from receipt OCR text.
    Returns dict with: merchant, amount, date, items.
    """
    prompt = f"""Extract from this receipt text. Return ONLY JSON, no other text:
{{ "merchant": str, "amount": float, "date": "YYYY-MM-DD" or null, "items": [str] }}

Receipt text:
{text[:2000]}"""

    try:
        client = _get_client()
        response = client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()
        return json.loads(raw_text)
    except Exception as e:
        logger.error("AI receipt extraction failed: %s", e)
        return None
