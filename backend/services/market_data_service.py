"""
Market data service — Claude Sonnet + web_search as the intelligence layer
between live Indian market data and asset valuations.

Claude searches the web for current prices, synthesizes results into structured
market context, which is then injected into the asset valuation prompt.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-6"

_WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5,
}

_LAND_KEYWORDS = frozenset(["land", "plot", "agricultural", "farm", "acre", "cent", "guntha", "bigha", "marla"])


def _get_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key)


def _run_web_search_agent(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Run Claude Sonnet with the built-in web_search tool.
    For web_search_20250305, Anthropic executes searches server-side within the same
    API call — tool_use, web_search_tool_result, and final text arrive in one response.
    Loops defensively in case Claude needs a follow-up turn.
    """
    try:
        client = _get_client()
        messages: list[dict] = [{"role": "user", "content": user_prompt}]

        for _ in range(4):
            response = client.messages.create(
                model=SONNET_MODEL,
                max_tokens=2000,
                system=system_prompt,
                tools=[_WEB_SEARCH_TOOL],
                messages=messages,
            )

            # Collect any text blocks present in this response
            text_blocks = [
                b for b in response.content
                if hasattr(b, "text") and b.text.strip()
            ]

            if response.stop_reason == "end_turn":
                return text_blocks[-1].text.strip() if text_blocks else None

            if response.stop_reason == "tool_use":
                # Built-in tools: results are already in response.content as
                # web_search_tool_result blocks — just append and continue.
                messages.append({"role": "assistant", "content": response.content})
                # If Claude already wrote a text block alongside tool use, use it.
                if text_blocks:
                    return text_blocks[-1].text.strip()
                # Otherwise provide a minimal user turn so roles alternate correctly.
                messages.append({"role": "user", "content": "Please continue."})
                continue

            break

        return None

    except Exception as e:
        logger.error("Web search agent failed: %s", e)
        return None


def _parse_json_from_llm(raw: str | None) -> Optional[dict]:
    """Strip markdown fences and parse JSON from LLM output."""
    if not raw:
        return None
    text = raw.strip()
    if "```" in text:
        parts = text.split("```")
        # parts[1] is inside the first fence
        candidate = parts[1].strip()
        if candidate.startswith("json"):
            candidate = candidate[4:].strip()
        text = candidate
    try:
        return json.loads(text)
    except Exception as e:
        logger.warning("JSON parse failed: %s | snippet: %.200s", e, raw)
        return None


# ── Real Estate ──────────────────────────────────────────────────────────────

def fetch_realestate_market_data(name: str, description: str) -> Optional[dict]:
    """
    Search current apartment/flat prices for a specific Indian locality.
    Returns locality-level price-per-sqft range and appreciation trend.
    """
    system = (
        "You are a real estate market data analyst for India. "
        "Use web_search to find CURRENT (2025–2026) property transaction prices from "
        "magicbricks.com, 99acres.com, housing.com, squareyards.com, or PropTiger. "
        "Always search for the specific locality, not just the city. "
        "Return ONLY valid JSON — no markdown fences, no explanation outside the JSON."
    )
    user = f"""Find the CURRENT real estate market price per sq ft for this property in India:

Property: {name}
Details: {description or "Not provided"}

Search for:
1. Current ready-possession apartment prices in the specific locality/micro-market
2. Recent transaction data (last 6 months) if available
3. Year-on-year price change

Return this exact JSON structure (numbers in INR, no units in values):
{{
  "locality": "<specific locality extracted from property details>",
  "city": "<city name>",
  "price_per_sqft_low": <number>,
  "price_per_sqft_high": <number>,
  "price_per_sqft_typical": <number>,
  "annual_appreciation_pct": <number e.g. 8 for 8%>,
  "trend": "<appreciating|stable|declining>",
  "data_sources": "<comma-separated sites used>",
  "source_note": "<1-2 sentences on data quality and recency>"
}}"""

    raw = _run_web_search_agent(system, user)
    result = _parse_json_from_llm(raw)
    if result:
        logger.info("Real estate market data for '%s': ₹%s–%s/sqft in %s",
                    name,
                    result.get("price_per_sqft_low", "?"),
                    result.get("price_per_sqft_high", "?"),
                    result.get("locality", "?"))
    return result


# ── Vehicle ───────────────────────────────────────────────────────────────────

def fetch_vehicle_market_data(name: str, description: str) -> Optional[dict]:
    """
    Search current used vehicle prices in India (CarDekho, CarWale, Cars24, Spinny).
    Returns market value range and depreciation rate.
    """
    system = (
        "You are an automobile market analyst for India. "
        "Use web_search to find CURRENT used vehicle prices from cardekho.com, carwale.com, "
        "cars24.com, spinny.com, or OLX Autos. "
        "Match the exact make, model, variant, and year from the asset details. "
        "Return ONLY valid JSON — no markdown fences, no explanation outside the JSON."
    )
    user = f"""Find the CURRENT used market value for this vehicle in India:

Vehicle: {name}
Details: {description or "Not provided"}

Search CarDekho, CarWale, Cars24, and Spinny for current resale prices.
Consider condition (assume good condition unless stated otherwise).

Return this exact JSON structure (numbers in INR):
{{
  "vehicle_make_model_year": "<make model year variant as identified>",
  "market_value_low": <number>,
  "market_value_high": <number>,
  "market_value_typical": <number>,
  "annual_depreciation_pct": <number e.g. 12 for 12%>,
  "years_old": <number>,
  "data_sources": "<comma-separated sites used>",
  "source_note": "<1-2 sentences on data quality and how you arrived at the value>"
}}"""

    raw = _run_web_search_agent(system, user)
    result = _parse_json_from_llm(raw)
    if result:
        logger.info("Vehicle market data for '%s': ₹%s–%s (typical ₹%s)",
                    name,
                    result.get("market_value_low", "?"),
                    result.get("market_value_high", "?"),
                    result.get("market_value_typical", "?"))
    return result


# ── Land ──────────────────────────────────────────────────────────────────────

def fetch_land_market_data(name: str, description: str) -> Optional[dict]:
    """
    Search current land/plot prices and government circle rates in India.
    Returns market rate and circle rate per sqft/cent/acre.
    """
    system = (
        "You are a land and property market analyst for India. "
        "Use web_search to find CURRENT land prices and government circle rates "
        "from state registration department portals, magicbricks.com, 99acres.com, "
        "and housing.com. "
        "Distinguish between agricultural, residential, and commercial land. "
        "Return ONLY valid JSON — no markdown fences, no explanation outside the JSON."
    )
    user = f"""Find CURRENT land market prices and circle rates for this land asset in India:

Land: {name}
Details: {description or "Not provided"}

Search for:
1. Current market rate per sq ft (or per cent / per acre for agricultural land)
2. Government circle rate (guidance value) for the area
3. Land type (agricultural / residential / commercial)
4. Recent price trend

Return this exact JSON structure (all price values in INR per sq ft):
{{
  "location": "<specific location/village/taluk extracted from details>",
  "district_state": "<district, state>",
  "land_type": "<agricultural|residential|commercial>",
  "market_rate_per_sqft": <number>,
  "circle_rate_per_sqft": <number>,
  "unit_used": "<sqft|cent|acre — whichever the source used, converted to sqft>",
  "annual_appreciation_pct": <number>,
  "trend": "<appreciating|stable|declining>",
  "data_sources": "<comma-separated sources>",
  "source_note": "<1-2 sentences on data quality>"
}}"""

    raw = _run_web_search_agent(system, user)
    result = _parse_json_from_llm(raw)
    if result:
        logger.info("Land market data for '%s': market ₹%s/sqft, circle ₹%s/sqft in %s",
                    name,
                    result.get("market_rate_per_sqft", "?"),
                    result.get("circle_rate_per_sqft", "?"),
                    result.get("location", "?"))
    return result


# ── Entry point ───────────────────────────────────────────────────────────────

def get_market_context(asset_type: str, name: str, description: str) -> Optional[dict]:
    """
    Fetch live market context for an asset based on its type.
    Returns a structured dict with web-searched market data, or None if not
    applicable or if the search fails.

    Covered types:
    - real_estate (apartments/flats)      → price per sqft by locality
    - real_estate (land/plots)            → circle rate + market rate per sqft
    - vehicle (cars/bikes)                → used vehicle market value range
    - other (if land keywords detected)   → land market data
    """
    combined = (name + " " + description).lower()
    is_land = any(kw in combined for kw in _LAND_KEYWORDS)

    if asset_type == "vehicle":
        return fetch_vehicle_market_data(name, description)

    if asset_type == "real_estate":
        if is_land:
            return fetch_land_market_data(name, description)
        return fetch_realestate_market_data(name, description)

    if asset_type == "other" and is_land:
        return fetch_land_market_data(name, description)

    return None
