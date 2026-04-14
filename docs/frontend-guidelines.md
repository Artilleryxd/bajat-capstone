# FinSight AI — Frontend Guidelines

## Page Layout Order

The loans page (`frontend/app/loans/page.tsx`) must render sections in this order:

1. Header + Optimize button
2. Summary metrics — Total Debt, Monthly Payments, Interest Saved, Months Saved
3. **Your Loans** — add form + loan cards
4. **Optimization Results** — strategy cards, comparison chart, AI insights at bottom
5. Payoff Timeline

## Key Files

| File | Role |
|------|------|
| `frontend/app/loans/page.tsx` | Live loans page — real API calls, no hardcoded data |
| `frontend/app/api/loans/route.ts` | Next.js proxy → GET + POST `/v1/loans` |
| `frontend/app/api/loans/optimize/route.ts` | Next.js proxy → POST `/v1/loans/optimize` |
| `frontend/lib/types/loan.ts` | TypeScript types for all loan and optimizer shapes |

## Data Rules

- The page uses **real API data only** — no hardcoded/mock data anywhere
- All loan and optimization TypeScript types are defined in `frontend/lib/types/loan.ts` — do not duplicate types elsewhere
