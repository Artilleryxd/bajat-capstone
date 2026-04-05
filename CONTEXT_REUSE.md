# Reusable Project Context

## Purpose
This file is a compact, reusable snapshot of the current FinSight AI workspace context. It is safe to paste into future sessions as a working reference.

## Project Identity
FinSight AI is a full-stack AI-driven personal finance assistant.

- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Python 3.12, FastAPI
- Database/Auth: Supabase PostgreSQL 15, Supabase Auth, RLS
- AI: Anthropic Claude API
- Cache: Upstash Redis
- Deployment: Vercel frontend, Railway backend

## Hard Rules
- Never expose API keys client-side. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be prefixed with `NEXT_PUBLIC_`.
- Never store tokens, session data, or financial info in `localStorage` or `sessionStorage`. Use httpOnly cookies only.
- Every new Supabase table must have RLS enabled and a `user_isolation` policy before use.
- Every FastAPI route must use `user = Depends(get_current_user)`.
- Never log or return raw stack traces to the client in production.
- No TypeScript `any` types.
- All API request and response shapes should have matching Pydantic models and TypeScript types.
- All async operations should be wrapped in try/catch with structured error responses.
- AI failures should degrade gracefully: save data, return a message, do not crash.
- Use React Server Components for data fetching. Use `use client` only when interactivity is required.
- Never use `useEffect` for data fetching.

## Architecture Decisions
- Auth guard lives in `app/(dashboard)/layout.tsx` as a Server Component.
- All Claude API calls go through `backend/app/services/ai_service.py`.
- Context assembly goes through `backend/app/services/context_builder.py`.
- Redis cache is mandatory for scraped data.
- Use Haiku (`claude-haiku-4-5-20251001`) for classification tasks.
- Use Sonnet (`claude-sonnet-4-20250514`) for reasoning tasks.

## Expense Category Colors
- needs: `#22C55E`
- wants: `#3B82F6`
- desires: `#F59E0B`
- investments: `#10B981`

## Investment Compliance
The AI must never recommend:
- Specific mutual fund names
- Specific stock tickers or company shares
- Specific crypto assets
- Tax-saving instruments as tax advice

It may recommend asset class allocations only.

## Workspace Layout
- Root: `AGENTS.md`, `skills-lock.json`
- Backend: `backend/`
- Frontend: `frontend/`

### Backend
- `backend/main.py`
- `backend/requirements.txt`
- `backend/db/`
- `backend/db/migrations/`
- `backend/routes/`
- `backend/schemas/`
- `backend/services/`
- `backend/utils/`

### Frontend
- `frontend/app/`
- `frontend/components/`
- `frontend/hooks/`
- `frontend/lib/`
- `frontend/public/`
- `frontend/styles/`

## Existing Migrations
- `backend/db/migrations/001_user_profiles_allow_pre_onboarding_nulls.sql`
- `backend/db/migrations/002_user_profiles_add_gender.sql`

## Existing Frontend Routes
- `app/page.tsx`
- `app/assets/page.tsx`
- `app/budget/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/expenses/page.tsx`
- `app/investments/page.tsx`
- `app/loans/page.tsx`
- `app/login/page.tsx`
- `app/onboarding/page.tsx`
- `app/settings/page.tsx`
- `app/signup/page.tsx`

## Existing Frontend Components
- `components/dashboard/ai-chat-panel.tsx`
- `components/dashboard/asset-allocation-chart.tsx`
- `components/dashboard/budget-cards.tsx`
- `components/dashboard/category-distribution.tsx`
- `components/dashboard/expense-table.tsx`
- `components/dashboard/investment-allocation-chart.tsx`
- `components/dashboard/loan-cards.tsx`
- `components/dashboard/sidebar.tsx`
- `components/dashboard/top-nav.tsx`
- `components/onboarding/Step1.tsx`
- `components/onboarding/Step2.tsx`
- `components/theme-provider.tsx`
- UI primitives under `components/ui/`

## Current Working Context
- The workspace is on Linux.
- The active repository is `/home/artillery/Coding/bajat-capstone`.
- This is a dirty or active development workspace, so existing user changes should be preserved.
- The current editor file was `/home/artillery/Coding/bajat-capstone/backend/.env` when this context was captured.

## Reusable Starter Prompt
Use this in a future session if you want a compact handoff:

> You are working in FinSight AI at `/home/artillery/Coding/bajat-capstone`. Follow the repo rules from `AGENTS.md`: no client-side secrets, no `localStorage` for tokens or financial data, every FastAPI route must use `Depends(get_current_user)`, all new Supabase tables need RLS and `user_isolation`, no TypeScript `any`, and no raw stack traces in production. The stack is Next.js 14 App Router + TypeScript + Tailwind/shadcn on the frontend, and Python 3.12 + FastAPI + Supabase on the backend. Claude calls must go through `backend/app/services/ai_service.py`, context assembly through `backend/app/services/context_builder.py`, and Redis caching is required for scraped data. Check the workspace before editing, keep changes minimal, and preserve unrelated user changes.

## Notes
This file intentionally excludes hidden system instructions and private internal reasoning. It only contains durable project context that is safe and useful for reuse.
