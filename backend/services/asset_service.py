"""Asset service — AI-powered market valuations and CRUD operations."""

import asyncio
import json
import logging
import os
from datetime import date, datetime
from typing import Optional

import httpx

from db.supabase_client import supabase_admin
from services.ai_categorizer import classify_financial_item
from services.market_data_service import get_market_context

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-6"

# Fallback growth rates used ONLY for projection when AI is unavailable
GROWTH_RATES: dict[str, float] = {
    "real_estate":  0.07,
    "gold":         0.08,
    "vehicle":     -0.15,
    "equity":       0.12,
    "fd":           0.07,
    "gadget":      -0.10,
    "other":        0.05,
}


# ── LIVE GOLD PRICE ──

async def _get_gold_price_inr() -> Optional[float]:
    """
    Fetch live 24K gold spot price in INR per gram.
    Sources: Yahoo Finance gold futures (GC=F) + open.er-api.com for USD→INR.
    Falls back to None so the AI prompt handles it gracefully.
    """
    try:
        async with httpx.AsyncClient(timeout=8, headers={"User-Agent": "Mozilla/5.0"}) as client:
            gold_resp, fx_resp = await asyncio.gather(
                client.get("https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1d"),
                client.get("https://open.er-api.com/v6/latest/USD"),
            )
            if gold_resp.status_code == 200 and fx_resp.status_code == 200:
                usd_per_oz = float(gold_resp.json()["chart"]["result"][0]["meta"]["regularMarketPrice"])
                inr_per_usd = float(fx_resp.json()["rates"]["INR"])
                if usd_per_oz > 0 and inr_per_usd > 0:
                    # 1 troy oz = 31.1035 grams
                    inr_per_gram = (usd_per_oz * inr_per_usd) / 31.1035
                    logger.info("Live gold: ₹%.0f/gram (%.2f USD/oz × %.4f USD→INR)", inr_per_gram, usd_per_oz, inr_per_usd)
                    return round(inr_per_gram, 2)
    except Exception as e:
        logger.warning("Gold price API failed: %s", e)
    return None


# ── AI-POWERED VALUATION (primary path for all asset types) ──

async def ai_project_asset(asset: dict) -> dict:
    """
    Use Claude Sonnet to estimate the CURRENT MARKET VALUE and project
    year-by-year value for the next 5 years.

    Does NOT anchor to the stored/purchase price — uses actual market knowledge
    for Indian real estate localities, used car values, gold spot prices, etc.
    Falls back to deterministic compound growth on any failure.
    """
    purchase_price = float(asset.get("purchase_price") or 0)
    asset_type = asset.get("asset_type", "other")
    name = asset.get("name", "Unknown Asset")
    metadata = asset.get("metadata") or {}
    description = str(metadata.get("description") or "")
    purchase_date = asset.get("purchase_date") or "unknown"

    # Fetch live gold price and include it in the prompt when relevant
    gold_context = ""
    if asset_type == "gold" or "gold" in name.lower() or "gold" in description.lower():
        gold_inr = await _get_gold_price_inr()
        if gold_inr:
            gold_context = f"\n- Live 24K Gold Rate: ₹{gold_inr:,.0f}/gram (use this as your anchor for gold valuation)"

    # Fetch live market context for real estate, vehicles, and land via web search
    market_context_block = ""
    if asset_type in ("real_estate", "vehicle") or (
        asset_type == "other"
        and any(kw in (name + description).lower() for kw in ["land", "plot", "agricultural", "farm", "acre"])
    ):
        try:
            market_data = await asyncio.to_thread(get_market_context, asset_type, name, description)
            if market_data:
                market_context_block = (
                    "\n\n## LIVE MARKET DATA (web-searched, use as primary reference — "
                    "override static benchmarks below):\n"
                    + json.dumps(market_data, indent=2)
                )
                logger.info("Market context injected for '%s' (%s)", name, asset_type)
        except Exception as exc:
            logger.warning("Market context fetch skipped for '%s': %s", name, exc)

    prompt = f"""You are a senior Indian financial analyst with deep expertise in asset valuation (April 2026).

Estimate the CURRENT MARKET VALUE of this asset using real market knowledge.
DO NOT simply apply a growth rate to the purchase price — use your knowledge of actual Indian market prices.

Asset Details:
- Name: {name}
- Category: {asset_type}
- Description: {description or "Not provided"}
- Purchase Price: ₹{purchase_price:,.0f}
- Purchase Date: {purchase_date}{gold_context}{market_context_block}

Valuation guidelines by asset type (use LIVE MARKET DATA above when available — it takes priority):
- real_estate (apartments/flats): If live market data is provided above, use price_per_sqft_typical
  multiplied by the area (sqft) from the description. If no area in description, estimate from
  purchase price context. Fallback benchmarks (April 2026): Mumbai premium ₹25,000–80,000/sqft,
  Mumbai suburbs ₹12,000–25,000/sqft, Bangalore premium ₹12,000–25,000/sqft,
  Bangalore suburbs ₹6,000–12,000/sqft, Delhi/NCR ₹8,000–30,000/sqft,
  Pune ₹7,000–16,000/sqft, Hyderabad ₹6,000–15,000/sqft, Chennai ₹6,000–14,000/sqft.
- real_estate (land/plots): If live market data is provided, use market_rate_per_sqft × area.
  Also compare against circle_rate_per_sqft (market is typically 10–50% above circle rate).
- gold/jewelry: Use the live gold rate above (if provided) per gram.
  Extract weight from description (e.g. "10g necklace", "50g bar"). For jewelry, deduct 15–20%
  making charges from melt value. For coins/bars use full melt value.
- vehicle (cars/bikes): If live market data is provided above, use market_value_typical as anchor,
  adjusting for actual condition vs typical. Fallback: Maruti/Hyundai/Honda depreciate 15% yr1,
  10% yrs 2–5; luxury (BMW, Mercedes) depreciate faster.
- watches/luxury_watches: LUXURY watches (Rolex, Omega, Patek Philippe, AP, IWC, Tag Heuer)
  follow different rules. Rolex: appreciates 5–15%/yr; Omega/IWC: hold 60–80% of purchase price.
  Entry-level fashion watches depreciate like gadgets.
- equity/stocks/mutual_funds: NIFTY 50 index ~12% CAGR, small cap ~15%, large cap ~10%.
- fd (fixed deposit): Calculate maturity value using standard FD rates (SBI: 6.5–7.1%,
  HDFC: 7–7.5%). Use rate from description if provided.
- gadget: iPhones retain value better (60–70% yr1), Android flagships 40–60%, budget 20–40%.
- other: Use contextual market knowledge and reasonable judgment.

Return ONLY valid JSON (no markdown, no explanation outside the JSON):
{{
  "current_value": <number>,
  "current_reasoning": "<2-3 sentences explaining how you arrived at this value using specific market data>",
  "projections": {{"1": <val>, "2": <val>, "3": <val>, "4": <val>, "5": <val>}},
  "projection_reasoning": "<2-3 sentences on the expected growth/depreciation trend>",
  "annual_rate": <decimal e.g. 0.07 for 7%>
}}"""

    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=SONNET_MODEL,
            max_tokens=800,
            temperature=0.1,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        if raw.startswith("```"):
            raw = "\n".join(raw.split("\n")[1:])
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        result = json.loads(raw)
        logger.info("AI valuation for '%s' (%s): ₹%.0f (purchase ₹%.0f)",
                    name, asset_type, result.get("current_value", 0), purchase_price)
        return result
    except Exception as exc:
        logger.error("AI projection failed for asset '%s': %s", name, exc)
        rate = GROWTH_RATES.get(asset_type, 0.05)
        fallback_value = float(asset.get("current_value") or purchase_price)
        return {
            "current_value": fallback_value,
            "current_reasoning": "AI estimation unavailable; using stored value.",
            "projections": project_asset_value(fallback_value, asset_type, [1, 2, 3, 4, 5]),
            "projection_reasoning": f"Projected at standard {asset_type} rate of {rate * 100:.0f}% p.a.",
            "annual_rate": rate,
        }


# ── PROJECTION (deterministic fallback only) ──

def project_asset_value(
    current_value: float,
    asset_type: str,
    years: list[int] | None = None,
) -> dict:
    """Calculate future value projections using compound growth."""
    if years is None:
        years = [1, 3, 5, 10]
    rate = GROWTH_RATES.get(asset_type, 0.05)
    return {
        str(y): round(current_value * ((1 + rate) ** y), 2)
        for y in years
    }


# ── CRUD OPERATIONS ──

async def add_asset(user_id: str, data: dict) -> dict:
    """
    Add a new asset:
    1. AI-classify the type
    2. AI-value the asset at current market rates (Claude Sonnet)
    3. Store in Supabase
    """
    name = data["name"]
    description = data.get("description", "")
    purchase_price = float(data["purchase_price"])
    purchase_date_raw = data.get("purchase_date", date.today().isoformat())
    metadata = data.get("metadata") or {}
    if description:
        metadata["description"] = description

    # Parse purchase date
    if isinstance(purchase_date_raw, str):
        try:
            purchase_date_parsed = date.fromisoformat(purchase_date_raw)
        except ValueError:
            purchase_date_parsed = date.today()
    elif isinstance(purchase_date_raw, date):
        purchase_date_parsed = purchase_date_raw
    else:
        purchase_date_parsed = date.today()

    # Step 1: AI classification
    classify_text = f"{name} {description}".strip()
    classification = classify_financial_item(classify_text)
    asset_type = classification.get("asset_type", "other")

    # Step 2: AI-powered market valuation (Claude Sonnet)
    user_current_value = data.get("current_value")
    if user_current_value and float(user_current_value) > 0:
        current_value = float(user_current_value)
        value_source = "manual"
        appreciation_rate = GROWTH_RATES.get(asset_type, 0.05)
    else:
        temp_asset = {
            "name": name,
            "asset_type": asset_type,
            "purchase_price": purchase_price,
            "purchase_date": purchase_date_parsed.isoformat(),
            "current_value": purchase_price,  # starting anchor, AI will override
            "metadata": metadata,
        }
        ai_result = await ai_project_asset(temp_asset)
        current_value = ai_result["current_value"]
        appreciation_rate = ai_result.get("annual_rate", GROWTH_RATES.get(asset_type, 0.05))
        value_source = "estimated"

    # Step 3: Store in Supabase
    row = {
        "user_id": user_id,
        "asset_type": asset_type,
        "name": name,
        "purchase_price": purchase_price,
        "purchase_date": purchase_date_parsed.isoformat(),
        "current_value": round(current_value, 2),
        "value_source": value_source,
        "appreciation_rate": appreciation_rate,
        "last_valued_at": datetime.now().isoformat(),
        "metadata": metadata,
    }

    try:
        result = supabase_admin.table("user_assets").insert(row).execute()
        if result.data:
            return result.data[0]
        return row
    except Exception as e:
        logger.error("Failed to insert asset: %s", e)
        raise


async def get_all_assets(user_id: str) -> list[dict]:
    """Fetch all assets for a user."""
    try:
        result = (
            supabase_admin
            .table("user_assets")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error("Failed to fetch assets: %s", e)
        return []


async def get_asset_by_id(asset_id: str, user_id: str) -> Optional[dict]:
    """Fetch a single asset by ID, ensuring user ownership."""
    try:
        result = (
            supabase_admin
            .table("user_assets")
            .select("*")
            .eq("id", asset_id)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("Failed to fetch asset %s: %s", asset_id, e)
        return None


async def refresh_asset_value(asset_id: str, user_id: str) -> Optional[dict]:
    """Re-run AI valuation and update the stored current value."""
    asset = await get_asset_by_id(asset_id, user_id)
    if not asset:
        return None

    ai_result = await ai_project_asset(asset)
    current_value = ai_result["current_value"]
    appreciation_rate = ai_result.get("annual_rate", GROWTH_RATES.get(asset.get("asset_type", "other"), 0.05))

    try:
        result = (
            supabase_admin
            .table("user_assets")
            .update({
                "current_value": round(current_value, 2),
                "value_source": "estimated",
                "appreciation_rate": appreciation_rate,
                "last_valued_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            })
            .eq("id", asset_id)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error("Failed to update asset value: %s", e)
        return None


# ── LOAN/LIABILITY CRUD ──

async def add_liability(user_id: str, data: dict) -> dict:
    """Add a new loan/liability to the loans table."""
    row = {
        "user_id": user_id,
        "loan_type": data["loan_type"],
        "lender": data.get("lender"),
        "principal_outstanding": float(data["principal_outstanding"]),
        "interest_rate": float(data["interest_rate"]),
        "emi_amount": float(data["emi_amount"]),
        "emis_remaining": int(data["emis_remaining"]),
        "tenure_months": data.get("tenure_months"),
        "down_payment": float(data.get("down_payment", 0)),
        "is_active": True,
    }

    try:
        result = supabase_admin.table("loans").insert(row).execute()
        if result.data:
            return result.data[0]
        return row
    except Exception as e:
        logger.error("Failed to insert liability: %s", e)
        raise


async def get_all_liabilities(user_id: str) -> list[dict]:
    """Fetch all active loans for a user."""
    try:
        result = (
            supabase_admin
            .table("loans")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error("Failed to fetch liabilities: %s", e)
        return []
