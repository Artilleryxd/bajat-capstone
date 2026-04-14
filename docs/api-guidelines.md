# FinSight AI — API Guidelines

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/loans` | Fetch all loans for authenticated user |
| POST | `/v1/loans` | Create a new loan |
| POST | `/v1/loans/optimize` | Run optimization engine on all loans |

## Next.js Proxies

| Proxy Route | Forwards To |
|-------------|-------------|
| `frontend/app/api/loans/route.ts` | GET + POST `/v1/loans` |
| `frontend/app/api/loans/optimize/route.ts` | POST `/v1/loans/optimize` |

## Response Schema — Optimization Output (STRICT)

```json
{
  "strategy_type": "avalanche | snowball",
  "total_interest_paid": 0,
  "months_to_close": 0,
  "total_payment": 0,
  "schedule": [
    {
      "month": 1,
      "loan_id": "uuid",
      "payment": 0,
      "interest": 0,
      "principal": 0,
      "remaining_balance": 0
    }
  ],
  "timeline": [
    { "year": 0, "total_balance": 0, "label": "Now" }
  ]
}
```

## Additional API Response Fields

| Field | Description |
|-------|-------------|
| `total_saved` | Baseline interest minus best strategy interest |
| `months_saved` | Baseline months minus best strategy months |
| `interest_diff` | Difference in interest between avalanche and snowball |
| `months_diff` | Difference in months between avalanche and snowball |
| `monthly_surplus` | Income minus total EMIs (0 if income ≤ EMIs) |

## Performance Constraints

- Maximum simulation: **600 months** (50 years)
- Schedule returned to frontend: **first 24 months only**
- Full schedule stored in DB (see DB Guidelines)
- Yearly timeline aggregated for chart rendering

## Strategy Selection Logic

Default strategy: **Avalanche** (minimises total interest).

Override conditions:
- Single loan → both strategies identical, report Avalanche
- `avalanche.total_interest <= snowball.total_interest` → best = avalanche
- Otherwise → best = snowball
