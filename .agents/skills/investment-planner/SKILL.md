---
name: investment-planner
description: >
  Use this skill when building the investment strategy planner: risk score
  calculation, asset class allocation generation, wealth projection charts,
  investable surplus calculation, or the investment chat window.
triggers:
  - "investment"
  - "risk score"
  - "risk profile"
  - "allocation"
  - "large cap"
  - "mid cap"
  - "portfolio"
  - "wealth projection"
  - "SIP"
  - "invest"
  - "risk appetite"
---

# FinSight AI — Investment Strategy Planner Skill

## COMPLIANCE HARD RULES
The AI MUST NOT name specific securities. It allocates to asset classes only.

| ✅ ALLOWED | ❌ FORBIDDEN |
|-----------|-------------|
| "30% large cap equity" | "Buy Nifty 50 index fund" |
| "20% mid cap" | "Invest in HDFC Mid-Cap Opportunities" |
| "10% gold" | "Buy Sovereign Gold Bonds" |
| "Aggressive profile suits you" | "Buy Reliance Industries" |

---

## Risk Score Algorithm
```python
# backend/app/services/investment_service.py

def calculate_risk_score(profile, loans: list, assets: list) -> int:
    """
    Score 0–100. Higher = more risk-tolerant.
    Conservative: 0–30 | Moderate: 31–60 | Aggressive: 61–100
    """
    from datetime import date
    score = 50  # base

    # Age factor (younger = higher tolerance)
    age = (date.today() - profile.date_of_birth).days // 365
    score += max(-20, min(20, (35 - age) * 0.8))

    # Income stability
    score += {"salaried": 10, "self_employed": 0, "freelance": -5}.get(profile.income_type, 0)

    # Dependents (each one reduces risk tolerance)
    score -= profile.num_dependents * 5

    # Debt-to-income ratio
    total_emi = sum(l.emi_amount for l in loans if l.is_active)
    dti = total_emi / profile.monthly_income if profile.monthly_income else 0.5
    score -= int(dti * 40)

    # Asset base (more net worth = can absorb risk)
    net_worth = sum(a.current_value for a in assets if a.current_value)
    if net_worth > profile.monthly_income * 60:  score += 15
    elif net_worth > profile.monthly_income * 24: score += 8

    # Experience
    score += {"beginner": -10, "intermediate": 0, "advanced": 15}.get(profile.investment_exp, 0)

    # Housing (owning = more stable = slightly higher risk ok)
    if profile.housing_status == "owned": score += 5

    return max(0, min(100, int(score)))

def get_risk_profile(score: int) -> str:
    if score <= 30: return "conservative"
    if score <= 60: return "moderate"
    return "aggressive"
```

## Allocation Templates by Profile
```python
ALLOCATION_TEMPLATES = {
    "conservative": {
        "large_cap_equity":    20,
        "mid_cap_equity":       0,
        "small_cap_equity":     0,
        "flexi_multi_cap":      5,
        "debt_funds":          40,
        "gold":                15,
        "international_equity": 0,
        "reits":                5,
        "liquid_funds":        15,
    },
    "moderate": {
        "large_cap_equity":    30,
        "mid_cap_equity":      15,
        "small_cap_equity":     5,
        "flexi_multi_cap":     10,
        "debt_funds":          20,
        "gold":                10,
        "international_equity": 5,
        "reits":                5,
        "liquid_funds":         0,
    },
    "aggressive": {
        "large_cap_equity":    30,
        "mid_cap_equity":      20,
        "small_cap_equity":    15,
        "flexi_multi_cap":     15,
        "debt_funds":           5,
        "gold":                 5,
        "international_equity": 10,
        "reits":                0,
        "liquid_funds":         0,
    },
}
# Note: AI may fine-tune these percentages based on specific context
```

## Investable Surplus Calculation
```python
def calculate_investable_surplus(profile, budget: dict, loans: list) -> float:
    """
    What's actually available to invest each month.
    """
    income = profile.monthly_income
    essential_expenses = (
        budget.get("rent", 0) +
        budget.get("groceries", 0) +
        budget.get("transport", 0) +
        budget.get("bills_utilities", 0) +
        budget.get("healthcare", 0) +
        budget.get("emergency_fund", 0)
    )
    total_emi = sum(l.emi_amount for l in loans if l.is_active)
    buffer = income * 0.05  # 5% discretionary buffer

    surplus = income - essential_expenses - total_emi - buffer
    return max(0, round(surplus, 2))
```

## Wealth Projection
```python
def project_wealth(
    monthly_sip: float,
    years: int,
    annual_return: float,
    existing_corpus: float = 0
) -> float:
    """
    Future value of SIP using compound interest formula.
    FV = P * [((1+r)^n - 1) / r] * (1+r) + existing * (1+r_annual)^years
    """
    r = annual_return / 12        # monthly rate
    n = years * 12                # total months
    sip_fv = monthly_sip * (((1 + r) ** n - 1) / r) * (1 + r)
    corpus_fv = existing_corpus * ((1 + annual_return) ** years)
    return round(sip_fv + corpus_fv, 2)

RETURN_ASSUMPTIONS = {
    "conservative": 0.09,   # 9% blended
    "moderate":     0.11,   # 11% blended
    "aggressive":   0.13,   # 13% blended
}
# Always show these as projections with disclaimer, not guarantees
```

---

## Investment Chat Module Instructions
```python
INVESTMENT_MODULE_INSTRUCTIONS = """
The user is reviewing their investment strategy.

When explaining:
1. Explain their risk score (what inputs drove it up or down)
2. Explain the asset class allocation in plain English
3. Show projected wealth at 5, 10, and 20 years based on their surplus
4. Address any life events they mention (marriage, home purchase, retirement)

NEVER name specific funds, stocks, or securities.
If the user asks about a specific fund by name, acknowledge the category
it belongs to and redirect to the allocation percentage for that category.

Always include: "These are general guidelines, not regulated investment advice.
Please consult a SEBI-registered advisor for personalised recommendations."
"""
```

---

## Dashboard Components

### Risk Gauge (SVG arc)
```typescript
// Display risk score as a semi-circular gauge (0–100)
// 0–30: green zone (conservative)
// 31–60: amber zone (moderate)
// 61–100: blue zone (aggressive)
```

### Allocation Pie Chart
```typescript
const ALLOCATION_COLORS: Record<string, string> = {
  large_cap_equity:    '#3B82F6',
  mid_cap_equity:      '#8B5CF6',
  small_cap_equity:    '#EC4899',
  flexi_multi_cap:     '#06B6D4',
  debt_funds:          '#22C55E',
  gold:                '#F59E0B',
  international_equity:'#F97316',
  reits:               '#84CC16',
  liquid_funds:        '#94A3B8',
}
```

### Projection Chart
Line chart with 3 scenarios (conservative / expected / optimistic return)
across 20-year horizon, with current investable surplus as the SIP amount.
