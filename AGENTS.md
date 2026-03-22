# FinSight AI — Project Rules (AGENTS.md)
# Read by Antigravity, Cursor, and Claude Code automatically

## PROJECT IDENTITY
You are building **FinSight AI**, a full-stack AI-driven personal finance assistant.
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Python 3.12 + FastAPI
- **Database/Auth:** Supabase (PostgreSQL 15 + Supabase Auth + RLS)
- **AI:** Anthropic Claude API (Sonnet for reasoning, Haiku for classification)
- **Cache:** Upstash Redis
- **Deployment:** Vercel (frontend), Railway (backend)

---

## NON-NEGOTIABLE RULES

### Security
- NEVER expose API keys client-side. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be prefixed `NEXT_PUBLIC_`.
- NEVER store tokens, session data, or financial info in `localStorage` or `sessionStorage`. Use httpOnly cookies only.
- EVERY new Supabase table MUST have RLS enabled and a `user_isolation` policy before it is used.
- EVERY FastAPI route MUST have `user = Depends(get_current_user)` — no exceptions.
- NEVER log or return raw stack traces to the client in production.

### Type Safety
- No TypeScript `any` types. Ever.
- All API request/response shapes must have a corresponding Pydantic model (backend) and TypeScript type (frontend).
- Run `supabase gen types typescript` after every schema change and commit the result to `frontend/types/supabase.ts`.

### Code Quality
- All async operations must be wrapped in try/catch with structured error responses.
- All AI failures must degrade gracefully — save the data, return a message, never crash.
- Use `React Server Components` for data fetching; `'use client'` only when interactivity is required.
- Never use `useEffect` for data fetching — use server components or React Query.

---

## ARCHITECTURE DECISIONS (DO NOT DEVIATE)

- Auth guard lives in `app/(dashboard)/layout.tsx` as a Server Component — never replicate it elsewhere.
- All Claude API calls go through `backend/app/services/ai_service.py` — never call Anthropic directly from a route handler.
- Context assembly goes through `backend/app/services/context_builder.py` — never manually build context inline.
- Redis cache is mandatory for all scraped data. Never scrape on every request.
- Use Haiku (`claude-haiku-4-5-20251001`) for classification tasks. Use Sonnet (`claude-sonnet-4-20250514`) for reasoning.

---

## EXPENSE CATEGORY COLOURS (use these exact values everywhere)
```
needs       → #22C55E  (green-500)
wants       → #3B82F6  (blue-500)
desires     → #F59E0B  (amber-500)
investments → #10B981  (emerald-500)
```

---

## INVESTMENT COMPLIANCE (CRITICAL)
The AI must NEVER recommend:
- Specific mutual fund names (e.g. "Axis Bluechip Fund")
- Specific stock tickers or company shares
- Specific crypto assets
- Tax-saving instruments as tax advice

It MAY recommend asset class allocations only (e.g. "30% large cap equity, 20% mid cap").

---

## SKILL LIBRARY
This project has the following skills available in `.agent/skills/`. Invoke them by describing what you need:

| Skill | When it activates |
|-------|-------------------|
| `finsight-core` | Architecture questions, project structure, module overview |
| `supabase-rls` | Creating/modifying database tables, writing migrations |
| `ai-context` | Building AI prompts, context payloads, streaming endpoints |
| `expense-categorizer` | Expense parsing, OCR pipeline, categorization logic |
| `budget-planner` | Budget generation, city cost scraping, allocation logic |
| `loan-optimizer` | EMI strategies, debt calculations, refinancing logic |
| `asset-tracker` | Asset/liability management, valuation scraping, net worth |
| `investment-planner` | Risk scoring, allocation strategy, projection calculations |
