---
name: budget-planner
description: >
  Use this skill when building the smart budget planner: generating AI budgets,
  scraping city cost-of-living data, comparing budget vs actuals, budget storage,
  or the "question this budget" chat window.
triggers:
  - "budget"
  - "budget planner"
  - "allocate income"
  - "cost of living"
  - "numbeo"
  - "scrape city"
  - "rent allocation"
  - "budget vs actual"
  - "budget chat"
---

# FinSight AI — Smart Budget Planner Skill

## Budget Line Items
Every generated budget covers these categories:
`rent · groceries · transport · bills_utilities · healthcare · investments
 emergency_fund · dining_entertainment · clothing · personal_care · miscellaneous`

---

## Scraping Pipeline (City Cost Data)

### Cache-First Rule
ALWAYS check Redis before scraping. Never scrape on every budget generation.

```python
# backend/app/services/scraper.py
import httpx, json
from app.utils.cache import redis_client

SCRAPE_TTL = {
    "city_costs":   60 * 60 * 24 * 7,   # 7 days
    "gold_rate":    60 * 60 * 4,         # 4 hours
    "property_idx": 60 * 60 * 24 * 30,  # 30 days
}

async def get_city_costs(city: str, country: str) -> dict:
    cache_key = f"scrape:city:{country}:{city}".lower().replace(' ', '_')

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    data = await _scrape_numbeo(city, country)
    if not data:
        data = await _scrape_expatistan(city, country)
    if not data:
        data = await _ai_estimate_costs(city, country)  # Haiku fallback

    await redis_client.setex(cache_key, SCRAPE_TTL["city_costs"], json.dumps(data))
    return data

async def _scrape_numbeo(city: str, country: str) -> dict | None:
    # Use playwright for JS-heavy pages
    from playwright.async_api import async_playwright
    url = f"https://www.numbeo.com/cost-of-living/in/{city.replace(' ', '-')}"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, timeout=15000)
        # Extract table data
        # ... parse cost items into structured dict
        await browser.close()
    return { "rent_1bhk": ..., "groceries_monthly": ..., "transport_monthly": ... }
```

---

## Budget Generation (Sonnet)
```python
# backend/app/services/budget_service.py

BUDGET_PROMPT = """
Generate a monthly budget allocation for this user. Return ONLY JSON, no text.

User profile:
{profile_summary}

City average costs (scraped data):
{city_costs}

Output format:
{{
  "allocations": {{
    "rent": number,
    "groceries": number,
    "transport": number,
    "bills_utilities": number,
    "healthcare": number,
    "investments": number,
    "emergency_fund": number,
    "dining_entertainment": number,
    "clothing": number,
    "personal_care": number,
    "miscellaneous": number
  }},
  "rationale": {{
    "rent": "reason string",
    "investments": "reason string"
    // ... one rationale per line item
  }},
  "total_allocated": number,
  "surplus_deficit": number
}}

Rules:
- Total allocated must not exceed monthly_income
- Investments + emergency_fund must be at least 15% of income
- Rent must reflect local market rates from scraped_data
- Adjust all amounts for number of dependents
"""

async def generate_budget(user_id: str, month_year: date) -> BudgetPlan:
    profile = get_profile_summary(user_id)
    city_costs = await get_city_costs(profile["city"], profile["country"])

    response = anthropic.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": BUDGET_PROMPT.format(
                profile_summary=json.dumps(profile, separators=(',',':')),
                city_costs=json.dumps(city_costs, separators=(',',':'))
            )
        }]
    )
    result = json.loads(response.content[0].text)

    # Store in DB
    supabase.table("budget_plans").insert({
        "user_id": user_id,
        "month_year": month_year.isoformat(),
        "allocations": result["allocations"],
        "ai_rationale": json.dumps(result["rationale"]),
        "scraped_data": city_costs,
    }).execute()

    return result
```

---

## Budget vs Actuals
```typescript
// components/modules/BudgetVsActuals.tsx
// Show each line item: allocated vs spent, with status indicator

type LineItem = {
  category: string
  allocated: number
  spent: number
  status: 'under' | 'on-track' | 'over'
}

function getStatus(allocated: number, spent: number): LineItem['status'] {
  const ratio = spent / allocated
  if (ratio > 1.0) return 'over'         // red
  if (ratio > 0.85) return 'on-track'    // amber
  return 'under'                          // green
}
```

---

## Budget Chat Module Instructions
```python
BUDGET_MODULE_INSTRUCTIONS = """
The user is looking at their generated monthly budget.
They may want to understand why specific amounts were chosen,
challenge an allocation, ask for adjustments, or understand trade-offs.

When explaining an allocation:
1. Reference the scraped city cost data
2. Reference their income and number of dependents
3. Explain the % of income this represents
4. Offer to recalculate if they want to change it

If the user wants to change an allocation, confirm the change would still
leave enough for essentials and savings goals before agreeing.
"""
```
