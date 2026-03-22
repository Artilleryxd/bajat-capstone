---
name: asset-tracker
description: >
  Use this skill when building the asset and liability tracker: asset input forms,
  auto-valuation scraping (gold, vehicles, property), net worth calculations,
  drill-down projections, or the asset dashboard.
triggers:
  - "asset"
  - "liability"
  - "net worth"
  - "property value"
  - "gold rate"
  - "vehicle valuation"
  - "possession"
  - "drill down"
  - "asset tracker"
---

# FinSight AI — Asset & Liability Tracker Skill

## Asset Types
```python
ASSET_TYPES = [
    "real_estate",    # House, flat, plot
    "vehicle",        # Car, bike, commercial
    "gold",           # Jewellery, coins, bars
    "fixed_deposit",  # Bank FD/RD
    "equity",         # Stocks, mutual funds
    "provident_fund", # EPF, PPF, NPS
    "business",       # Business equity/ownership
    "other",
]
```

---

## Auto-Valuation Scrapers

### Gold Rate (refresh every 4 hours)
```python
async def get_gold_rate_per_gram() -> float:
    cache_key = "scrape:gold:INR"
    cached = await redis_client.get(cache_key)
    if cached: return float(cached)

    # Scrape IBJA or MCX
    async with httpx.AsyncClient() as client:
        res = await client.get("https://ibja.co/", timeout=10)
        # parse 24K rate per 10g → divide by 10
        rate = parse_gold_rate(res.text)

    await redis_client.setex(cache_key, 4 * 3600, str(rate))
    return rate

def calculate_gold_value(weight_grams: float, purity: str = "24K") -> float:
    rate = get_gold_rate_per_gram()
    purity_factor = {"24K": 1.0, "22K": 0.9167, "18K": 0.75}.get(purity, 1.0)
    return weight_grams * rate * purity_factor
```

### Vehicle Valuation (refresh every 30 days)
```python
async def get_vehicle_value(make: str, model: str, year: int) -> float:
    cache_key = f"scrape:vehicle:{make}:{model}:{year}".lower().replace(' ','_')
    cached = await redis_client.get(cache_key)
    if cached: return float(cached)

    # Scrape CarWale/CarDekho resale price estimator
    # Fall back to AI depreciation estimate if scrape fails
    value = await _scrape_vehicle_value(make, model, year) \
         or await _ai_estimate_vehicle_value(make, model, year)

    await redis_client.setex(cache_key, 30 * 24 * 3600, str(value))
    return value
```

### Property Index (refresh every 30 days)
```python
async def get_property_value_estimate(city: str, area_sqft: int, locality: str) -> float:
    """
    Use NHB RESIDEX or 99acres locality rates.
    Returns estimated current market value.
    """
    cache_key = f"scrape:property:{city}:{locality}".lower().replace(' ','_')
    # ... scrape rate per sq ft → multiply by area
```

---

## Net Worth Calculation
```python
def calculate_net_worth(assets: list[dict], liabilities: list[dict]) -> dict:
    total_assets = sum(a["current_value"] for a in assets if a["current_value"])
    total_liabilities = sum(
        l["principal_outstanding"] for l in liabilities if l["is_active"]
    )
    return {
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
        "debt_to_asset_ratio": round(total_liabilities / total_assets, 3) if total_assets else 0,
    }
```

## Future Value Projection (Drill-down)
```python
def project_asset_value(
    current_value: float,
    asset_type: str,
    years: list[int] = [1, 3, 5, 10]
) -> dict:
    """
    Conservative growth rate assumptions by asset class.
    These are general estimates — do not present as guaranteed returns.
    """
    GROWTH_RATES = {
        "real_estate":    0.07,   # 7% p.a.
        "gold":           0.08,   # 8% p.a.
        "vehicle":       -0.15,   # -15% p.a. (depreciation)
        "equity":         0.12,   # 12% p.a.
        "fixed_deposit":  0.07,   # 7% p.a.
        "provident_fund": 0.085,  # 8.5% p.a.
        "other":          0.05,
    }
    rate = GROWTH_RATES.get(asset_type, 0.05)
    return {
        str(y): round(current_value * ((1 + rate) ** y), 2)
        for y in years
    }
```

---

## Dashboard Components

### Net Worth Summary Card
```typescript
// components/modules/NetWorthCard.tsx
export function NetWorthCard({ netWorth, totalAssets, totalLiabilities }) {
  const isPositive = netWorth >= 0
  return (
    <div className="rounded-2xl bg-card p-6 border">
      <p className="text-sm text-muted-foreground">Net Worth</p>
      <p className={`text-3xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        ₹{Math.abs(netWorth).toLocaleString('en-IN')}
      </p>
      <div className="flex gap-4 mt-3 text-sm">
        <span className="text-emerald-500">Assets ₹{totalAssets.toLocaleString('en-IN')}</span>
        <span className="text-red-400">Liabilities ₹{totalLiabilities.toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}
```

### Drill-down Modal
Clicking any asset row opens a modal showing:
- Purchase value + date
- Current value + source (scraped/manual)
- Appreciation % since purchase
- Projected values at 1 / 3 / 5 / 10 years (with growth rate disclaimer)
- "Update value manually" button

---

## Liability Source
Liabilities are auto-populated from the `loans` table (`is_active = true`).
Additional informal liabilities can be added manually to `user_assets` with
`asset_type = 'liability'` and a negative `current_value`.
