"""Asset service — valuation scraping, projection calculations, and CRUD operations."""

import json
import logging
import os
from datetime import date, datetime
from typing import Optional

import httpx

from db.supabase_client import supabase_admin
from services.ai_categorizer import classify_financial_item

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-6"

# ── Growth rates by asset type (conservative estimates) ──
GROWTH_RATES: dict[str, float] = {
    "real_estate":  0.07,   # 7% p.a.
    "gold":         0.08,   # 8% p.a.
    "vehicle":     -0.15,   # -15% p.a. (depreciation)
    "equity":       0.12,   # 12% p.a.
    "fd":           0.07,   # 7% p.a.
    "gadget":      -0.25,   # -25% p.a. (depreciation)
    "other":        0.05,   # 5% p.a.
}

# ── Cache TTL per asset type (seconds) ──
CACHE_TTL: dict[str, int] = {
    "gold":        4 * 3600,       # 4 hours
    "vehicle":     30 * 24 * 3600, # 30 days
    "real_estate": 30 * 24 * 3600, # 30 days
    "gadget":      0,              # no scraping, pure model
    "equity":      0,
    "fd":          0,
    "other":       0,
}

# ── In-memory fallback cache if Redis is unavailable ──
_memory_cache: dict[str, tuple[float, float]] = {}  # key -> (value, expiry_timestamp)


def _get_redis():
    """Get Upstash Redis client, or None if unavailable."""
    try:
        redis_url = os.environ.get("REDIS_URL") or os.environ.get("UPSTASH_REDIS_REST_URL")
        redis_token = os.environ.get("REDIS_TOKEN") or os.environ.get("UPSTASH_REDIS_REST_TOKEN")
        if redis_url and redis_token:
            from upstash_redis import Redis
            return Redis(url=redis_url, token=redis_token)
    except Exception as e:
        logger.warning("Redis unavailable, using memory cache: %s", e)
    return None


async def _cache_get(key: str) -> Optional[str]:
    """Get from Redis or memory cache."""
    redis = _get_redis()
    if redis:
        try:
            val = redis.get(key)
            return val
        except Exception:
            pass
    # Fallback to memory cache
    if key in _memory_cache:
        val, expiry = _memory_cache[key]
        if datetime.now().timestamp() < expiry:
            return str(val)
        del _memory_cache[key]
    return None


async def _cache_set(key: str, value: str, ttl: int) -> None:
    """Set in Redis or memory cache."""
    redis = _get_redis()
    if redis:
        try:
            redis.setex(key, ttl, value)
            return
        except Exception:
            pass
    # Fallback to memory cache
    _memory_cache[key] = (float(value), datetime.now().timestamp() + ttl)


# ── SCRAPING FUNCTIONS ──

async def _scrape_gold_rate_per_gram() -> Optional[float]:
    """Scrape live gold rate per gram in INR (24K)."""
    cache_key = "scrape:gold:INR:24k"
    cached = await _cache_get(cache_key)
    if cached:
        return float(cached)

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            # Try GoodReturns gold rate page
            res = await client.get(
                "https://www.goodreturns.in/gold-rates/",
                headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
            )
            if res.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(res.text, "html.parser")
                # Look for 24K gold rate
                rate_elements = soup.find_all("td")
                for i, td in enumerate(rate_elements):
                    text = td.get_text(strip=True)
                    if "24" in text and "Carat" in text or "24K" in text:
                        # Next td usually has the rate
                        if i + 1 < len(rate_elements):
                            rate_text = rate_elements[i + 1].get_text(strip=True)
                            rate_text = rate_text.replace(",", "").replace("₹", "").strip()
                            try:
                                rate_per_10g = float(rate_text)
                                rate_per_gram = rate_per_10g / 10
                                await _cache_set(cache_key, str(rate_per_gram), CACHE_TTL["gold"])
                                logger.info("Scraped gold rate: ₹%.2f/gram", rate_per_gram)
                                return rate_per_gram
                            except ValueError:
                                continue
    except Exception as e:
        logger.warning("Gold rate scraping failed: %s", e)

    # Fallback: approximate market rate
    fallback_rate = 7500.0  # ~₹7500/gram as of 2026 estimate
    logger.info("Using fallback gold rate: ₹%.2f/gram", fallback_rate)
    return fallback_rate


async def _scrape_vehicle_value(name: str, metadata: Optional[dict] = None) -> Optional[float]:
    """Estimate vehicle resale value using scraping or depreciation model."""
    make = (metadata or {}).get("make", "")
    model_name = (metadata or {}).get("model", name)
    year = (metadata or {}).get("year", "")

    cache_key = f"scrape:vehicle:{make}:{model_name}:{year}".lower().replace(" ", "_")
    cached = await _cache_get(cache_key)
    if cached:
        return float(cached)

    try:
        search_query = f"{make} {model_name} {year}".strip()
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            res = await client.get(
                f"https://www.cardekho.com/used-cars+{search_query.replace(' ', '+')}",
                headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
            )
            if res.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(res.text, "html.parser")
                # Look for price elements
                price_elements = soup.find_all(class_=lambda c: c and "price" in c.lower()) if soup else []
                for el in price_elements:
                    price_text = el.get_text(strip=True)
                    price_text = price_text.replace(",", "").replace("₹", "").replace("Lakh", "").strip()
                    try:
                        price = float(price_text)
                        if price < 1000:  # Likely in Lakhs
                            price *= 100000
                        if price > 10000:
                            await _cache_set(cache_key, str(price), CACHE_TTL["vehicle"])
                            logger.info("Scraped vehicle value: ₹%.0f", price)
                            return price
                    except ValueError:
                        continue
    except Exception as e:
        logger.warning("Vehicle scraping failed: %s", e)

    return None


async def _estimate_gadget_value(purchase_price: float, purchase_date: Optional[date]) -> float:
    """Depreciation model for gadgets (no scraping)."""
    if not purchase_date:
        return purchase_price * 0.75  # default 25% depreciation
    years = (date.today() - purchase_date).days / 365.25
    depreciated = purchase_price * ((1 - 0.25) ** years)
    return max(depreciated, purchase_price * 0.05)  # floor at 5% of purchase price


# ── MAIN VALUATION FUNCTION ──

async def fetch_asset_valuation(
    asset_type: str,
    purchase_price: float,
    purchase_date: Optional[date] = None,
    metadata: Optional[dict] = None,
    name: str = "",
) -> tuple[float, str]:
    """
    Fetch current market value for an asset.
    Returns (value, source) where source is 'scraped', 'estimated', or 'manual'.
    """
    try:
        if asset_type == "gold":
            rate = await _scrape_gold_rate_per_gram()
            if rate and metadata:
                weight = metadata.get("weight_grams", 0)
                purity = metadata.get("purity", "24K")
                purity_factor = {"24K": 1.0, "22K": 0.9167, "18K": 0.75}.get(purity, 1.0)
                if weight > 0:
                    return weight * rate * purity_factor, "scraped"
            # Fallback: apply growth rate from purchase price
            if purchase_price and purchase_date:
                years = (date.today() - purchase_date).days / 365.25
                estimated = purchase_price * ((1 + GROWTH_RATES["gold"]) ** years)
                return estimated, "estimated"
            return purchase_price, "manual"

        elif asset_type == "vehicle":
            scraped = await _scrape_vehicle_value(name, metadata)
            if scraped:
                return scraped, "scraped"
            # Fallback: depreciation model
            if purchase_price and purchase_date:
                years = (date.today() - purchase_date).days / 365.25
                depreciated = purchase_price * ((1 + GROWTH_RATES["vehicle"]) ** years)
                return max(depreciated, purchase_price * 0.05), "estimated"
            return purchase_price * 0.85, "estimated"

        elif asset_type == "gadget":
            value = await _estimate_gadget_value(purchase_price, purchase_date)
            return value, "estimated"

        elif asset_type == "real_estate":
            # Use growth rate estimation (scraping property indices is unreliable)
            if purchase_price and purchase_date:
                years = (date.today() - purchase_date).days / 365.25
                estimated = purchase_price * ((1 + GROWTH_RATES["real_estate"]) ** years)
                return estimated, "estimated"
            return purchase_price, "manual"

        else:
            # fd, equity, other — use growth rate or purchase price
            rate = GROWTH_RATES.get(asset_type, 0.05)
            if purchase_price and purchase_date:
                years = (date.today() - purchase_date).days / 365.25
                estimated = purchase_price * ((1 + rate) ** years)
                return estimated, "estimated"
            return purchase_price, "manual"

    except Exception as e:
        logger.error("Valuation failed for %s '%s': %s", asset_type, name, e)
        return purchase_price, "manual"


# ── PROJECTION FUNCTION ──

def project_asset_value(
    current_value: float,
    asset_type: str,
    years: list[int] | None = None,
) -> dict:
    """
    Calculate future value projections using compound growth.
    FV = PV * (1 + r)^n
    """
    if years is None:
        years = [1, 3, 5, 10]
    rate = GROWTH_RATES.get(asset_type, 0.05)
    return {
        str(y): round(current_value * ((1 + rate) ** y), 2)
        for y in years
    }


async def ai_project_asset(asset: dict) -> dict:
    """
    Use Claude Sonnet to estimate the current market value and project
    year-by-year value for the next 5 years.
    Falls back to deterministic compound growth on any failure.
    """
    purchase_price = float(asset.get("purchase_price") or 0)
    stored_current = float(asset.get("current_value") or purchase_price)
    asset_type = asset.get("asset_type", "other")
    name = asset.get("name", "Unknown Asset")
    metadata = asset.get("metadata") or {}
    description = str(metadata.get("description") or "")
    purchase_date = asset.get("purchase_date") or "unknown"

    prompt = f"""You are a financial analyst. Estimate the current market value and 5-year projection for this asset.

Asset Details:
- Name: {name}
- Category: {asset_type} (real_estate | vehicle | gold | equity | fd | gadget | other)
- Description: {description or 'Not provided'}
- Purchase Price: \u20b9{purchase_price:,.0f}
- Purchase Date: {purchase_date}
- Stored Current Value: \u20b9{stored_current:,.0f}
- Today: April 2026

Reference annual rates: real_estate=7%, gold=8%, vehicle=-15% (depreciates), equity=12%, fd=7%, gadget=-25% (depreciates), other=5%.
Adjust based on the description, brand, location, and market conditions.

Return ONLY valid JSON (no markdown fences):
{{
  "current_value": <number>,
  "current_reasoning": "<1-2 sentences on why this is the current value>",
  "projections": {{"1": <val>, "2": <val>, "3": <val>, "4": <val>, "5": <val>}},
  "projection_reasoning": "<2-3 sentences on the growth/depreciation trend>",
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
            max_tokens=500,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = "\n".join(raw.split("\n")[1:])
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        result = json.loads(raw)
        logger.info("AI projection for '%s': current=%.0f rate=%.2f", name,
                     result.get("current_value", 0), result.get("annual_rate", 0))
        return result
    except Exception as exc:
        logger.error("AI projection failed for asset '%s': %s", name, exc)
        rate = GROWTH_RATES.get(asset_type, 0.05)
        return {
            "current_value": stored_current,
            "current_reasoning": "Stored value used (AI estimation unavailable).",
            "projections": project_asset_value(stored_current, asset_type, [1, 2, 3, 4, 5]),
            "projection_reasoning": (
                f"Projected using standard {asset_type} growth rate of {rate * 100:.0f}% per annum."
            ),
            "annual_rate": rate,
        }


# ── CRUD OPERATIONS ──

async def add_asset(user_id: str, data: dict) -> dict:
    """
    Add a new asset:
    1. Classify via AI
    2. Fetch current valuation
    3. Compute appreciation rate
    4. Store in Supabase
    """
    name = data["name"]
    description = data.get("description", "")
    purchase_price = float(data["purchase_price"])
    purchase_date_raw = data.get("purchase_date", date.today().isoformat())
    metadata = data.get("metadata") or {}
    # Persist description in metadata so it's available for AI projection later
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

    # Step 2: Fetch valuation
    user_current_value = data.get("current_value")
    if user_current_value and float(user_current_value) > 0:
        current_value = float(user_current_value)
        value_source = "manual"
    else:
        current_value, value_source = await fetch_asset_valuation(
            asset_type=asset_type,
            purchase_price=purchase_price,
            purchase_date=purchase_date_parsed,
            metadata=metadata,
            name=name,
        )

    # Step 3: Compute appreciation rate
    appreciation_rate = GROWTH_RATES.get(asset_type, 0.05)

    # Step 4: Store in Supabase
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
    """Re-scrape and update the current value for an asset."""
    asset = await get_asset_by_id(asset_id, user_id)
    if not asset:
        return None

    purchase_date = None
    if asset.get("purchase_date"):
        try:
            purchase_date = date.fromisoformat(asset["purchase_date"])
        except (ValueError, TypeError):
            pass

    current_value, value_source = await fetch_asset_valuation(
        asset_type=asset["asset_type"],
        purchase_price=float(asset.get("purchase_price", 0)),
        purchase_date=purchase_date,
        metadata=asset.get("metadata"),
        name=asset["name"],
    )

    try:
        result = (
            supabase_admin
            .table("user_assets")
            .update({
                "current_value": round(current_value, 2),
                "value_source": value_source,
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
