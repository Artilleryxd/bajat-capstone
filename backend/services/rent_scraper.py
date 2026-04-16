"""Rent estimation service using best-effort scraping with heuristic fallback."""

from __future__ import annotations

import logging
import re
from statistics import mean
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

CITY_TIER_KEYWORDS: dict[str, set[str]] = {
    "metro": {
        "mumbai",
        "navi mumbai",
        "kharghar",
        "thane",
        "delhi",
        "new delhi",
        "gurgaon",
        "gurugram",
        "noida",
        "bengaluru",
        "bangalore",
        "hyderabad",
        "chennai",
        "kolkata",
        "pune",
        "ahmedabad",
    },
    "tier_2": {
        "jaipur",
        "lucknow",
        "indore",
        "bhopal",
        "coimbatore",
        "surat",
        "nagpur",
        "kochi",
        "visakhapatnam",
        "vadodara",
        "chandigarh",
        "patna",
        "mohali",
    },
}

HEURISTIC_RENTS: dict[str, dict[str, tuple[int, int]]] = {
    "metro": {
        "1BHK": (18000, 30000),
        "2BHK": (30000, 50000),
        "3BHK": (50000, 85000),
    },
    "tier_2": {
        "1BHK": (9000, 16000),
        "2BHK": (15000, 26000),
        "3BHK": (24000, 38000),
    },
    "tier_3": {
        "1BHK": (6000, 12000),
        "2BHK": (10000, 18000),
        "3BHK": (15000, 26000),
    },
}


def _infer_bhk(dependents: int) -> str:
    if dependents <= 0:
        return "1BHK"
    if dependents <= 2:
        return "1BHK"
    if dependents <= 4:
        return "2BHK"
    return "3BHK"


def _city_tier(location: str) -> str:
    normalized = location.strip().lower()
    for tier, keywords in CITY_TIER_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return tier
    return "tier_3"


def _extract_rent_values(text: str) -> list[int]:
    """Extract plausible monthly rent values from unstructured text."""
    values: list[int] = []
    pattern = re.compile(
        r"(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{2,3})+|\d{4,7})(?:\s*(lakh|lac|crore))?",
        flags=re.IGNORECASE,
    )

    for match in pattern.finditer(text):
        raw_value = match.group(1).replace(",", "")
        suffix = (match.group(2) or "").lower()

        try:
            value = float(raw_value)
        except ValueError:
            continue

        if suffix in {"lakh", "lac"}:
            value *= 100000
        elif suffix == "crore":
            value *= 10000000

        as_int = int(value)
        if 3000 <= as_int <= 500000:
            values.append(as_int)

    return values


def _aggregate_rents(rents: list[int]) -> dict[str, int] | None:
    if not rents:
        return None

    cleaned = sorted(rents)
    if len(cleaned) >= 10:
        trim = max(1, len(cleaned) // 10)
        cleaned = cleaned[trim:-trim]

    if not cleaned:
        return None

    min_rent = min(cleaned)
    max_rent = max(cleaned)
    avg_rent = int(round(mean(cleaned)))

    return {
        "avg_rent": avg_rent,
        "min_rent": min_rent,
        "max_rent": max_rent,
    }


def _heuristic_estimate(location: str, bhk: str) -> dict[str, int]:
    tier = _city_tier(location)
    min_rent, max_rent = HEURISTIC_RENTS[tier][bhk]
    return {
        "avg_rent": int(round((min_rent + max_rent) / 2)),
        "min_rent": min_rent,
        "max_rent": max_rent,
    }


def _build_source_urls(location: str, bhk: str) -> list[str]:
    query = quote_plus(f"{bhk} rent in {location}")
    slug = quote_plus(location.strip())
    return [
        f"https://www.99acres.com/search/property/rent?keyword={query}",
        f"https://www.magicbricks.com/property-for-rent/residential-real-estate?cityName={slug}&keyword={query}",
    ]


async def _fetch_html(client: httpx.AsyncClient, url: str) -> str:
    response = await client.get(url)
    response.raise_for_status()
    return response.text


async def _scrape_rent_estimates(location: str, bhk: str) -> list[int]:
    urls = _build_source_urls(location, bhk)
    collected: list[int] = []

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    timeout = httpx.Timeout(connect=5.0, read=8.0, write=8.0, pool=8.0)
    async with httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True) as client:
        for url in urls:
            try:
                html = await _fetch_html(client, url)
                soup = BeautifulSoup(html, "html.parser")

                page_text = soup.get_text(" ", strip=True)
                collected.extend(_extract_rent_values(page_text))

                for selector in [
                    "[data-price]",
                    ".price",
                    "[class*='price']",
                    "[class*='rent']",
                    "script",
                ]:
                    for node in soup.select(selector):
                        snippet = node.get_text(" ", strip=True) if node.name != "script" else (node.string or "")
                        if snippet:
                            collected.extend(_extract_rent_values(snippet))
            except Exception as exc:
                logger.warning("Rent scrape failed for %s: %s", url, exc)

    return collected


async def get_rent_estimate(location: str, dependents: int) -> dict[str, int | str]:
    """
    Estimate monthly rent for a location and household size.

    Scraping is attempted first. If any scrape step fails or returns no usable
    values, heuristic estimates based on city tier are returned.
    """
    try:
        clean_location = (location or "").strip()
        if not clean_location:
            raise ValueError("location must be a non-empty string")

        recommended_bhk = _infer_bhk(dependents)

        scraped_values = await _scrape_rent_estimates(clean_location, recommended_bhk)
        aggregated = _aggregate_rents(scraped_values)

        if aggregated is None:
            aggregated = _heuristic_estimate(clean_location, recommended_bhk)

        return {
            "recommended_bhk": recommended_bhk,
            "avg_rent": aggregated["avg_rent"],
            "min_rent": aggregated["min_rent"],
            "max_rent": aggregated["max_rent"],
        }
    except Exception as exc:
        logger.error("Rent estimate failed, using fallback heuristic: %s", exc)
        fallback_bhk = _infer_bhk(dependents)
        fallback = _heuristic_estimate(location or "", fallback_bhk)
        return {
            "recommended_bhk": fallback_bhk,
            "avg_rent": fallback["avg_rent"],
            "min_rent": fallback["min_rent"],
            "max_rent": fallback["max_rent"],
        }