# Technical Requirements Document (TRD)
## Personal Finance Assistant — FinSight AI
**Version:** 1.0  
**Date:** March 2026  
**Status:** Draft  

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│              Next.js 14 App Router (Vercel)                      │
│   React 18 · TypeScript · Tailwind CSS · shadcn/ui · Recharts   │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTPS / REST / SSE
┌────────────────────────▼─────────────────────────────────────────┐
│                        API LAYER                                 │
│         Next.js API Routes (lightweight proxy/auth)              │
│              FastAPI (Python) — Core AI & Logic                  │
│                   Railway / Render                               │
└──────┬─────────────────┬───────────────────┬─────────────────────┘
       │                 │                   │
┌──────▼──────┐  ┌───────▼──────┐  ┌────────▼──────────┐
│  Supabase   │  │ Anthropic    │  │  External APIs    │
│  DB + Auth  │  │ Claude API   │  │  Numbeo · Vision  │
│  pgcrypto   │  │ (claude-3.5) │  │  Scraper Service  │
└─────────────┘  └──────────────┘  └───────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend
| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS + shadcn/ui | 3.x |
| Charts | Recharts | 2.x |
| State Management | Zustand | 4.x |
| Forms | React Hook Form + Zod | Latest |
| File Upload | react-dropzone | Latest |
| AI Chat Stream | Vercel AI SDK | 3.x |
| Animation | Framer Motion | 11.x |
| Icons | Lucide React | Latest |

### 2.2 Backend
| Concern | Technology | Version |
|---------|-----------|---------|
| Framework | FastAPI | 0.110.x |
| Language | Python | 3.12 |
| AI Client | anthropic (Python SDK) | Latest |
| OCR | pytesseract / Google Vision API | Latest |
| PDF Parsing | pdfplumber | Latest |
| Spreadsheet | openpyxl / pandas | Latest |
| Web Scraping | playwright + BeautifulSoup4 | Latest |
| HTTP Client | httpx | Latest |
| Task Queue | Celery + Redis | Latest |
| Caching | Redis | 7.x |

### 2.3 Database & Auth
| Concern | Technology |
|---------|-----------|
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth |
| ORM | Supabase JS Client (frontend) · psycopg3 (backend) |
| Encryption | pgcrypto extension |
| Migrations | Supabase CLI migrations |
| RLS | Row-Level Security on all tables |

### 2.4 Infrastructure
| Concern | Technology |
|---------|-----------|
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |
| Cache/Queue | Upstash Redis |
| File Storage | Supabase Storage |
| CDN | Vercel Edge Network |
| Monitoring | Sentry (errors) · Posthog (analytics) |
| CI/CD | GitHub Actions |

---

## 3. Database Schema

### 3.1 Table: `user_profiles`
```sql
CREATE TABLE user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  date_of_birth       DATE,
  gender              TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  country             TEXT NOT NULL,
  city                TEXT NOT NULL,
  neighbourhood       TEXT,
  monthly_income      NUMERIC(15,2),       -- encrypted via pgcrypto in app layer
  income_type         TEXT CHECK (income_type IN ('salaried','self_employed','freelance','other')),
  currency            TEXT DEFAULT 'INR',
  marital_status      TEXT CHECK (marital_status IN ('single','married','divorced','widowed')),
  num_dependents      SMALLINT DEFAULT 0,
  housing_status      TEXT CHECK (housing_status IN ('owned','rented','family')),
  investment_exp      TEXT CHECK (investment_exp IN ('beginner','intermediate','advanced')),
  has_existing_loans  BOOLEAN DEFAULT FALSE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own profile"
  ON user_profiles FOR ALL USING (auth.uid() = id);
```

### 3.2 Table: `expenses`
```sql
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year      DATE NOT NULL,              -- e.g., 2026-03-01 (always day=1)
  description     TEXT NOT NULL,
  merchant        TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT DEFAULT 'INR',
  category        TEXT CHECK (category IN ('needs','wants','desires','investments')),
  subcategory     TEXT,                       -- e.g., "groceries", "dining_out"
  source          TEXT CHECK (source IN ('manual','csv','pdf','receipt','ai')),
  ai_confidence   NUMERIC(3,2),               -- 0.00–1.00
  user_override   BOOLEAN DEFAULT FALSE,
  expense_date    DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_expenses_user_month ON expenses(user_id, month_year);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User expense isolation" ON expenses FOR ALL USING (auth.uid() = user_id);
```

### 3.3 Table: `budget_plans`
```sql
CREATE TABLE budget_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year      DATE NOT NULL,
  version         SMALLINT DEFAULT 1,
  is_active       BOOLEAN DEFAULT TRUE,
  allocations     JSONB NOT NULL,            -- { "rent": 25000, "groceries": 8000, ... }
  ai_rationale    TEXT,
  scraped_data    JSONB,                     -- raw city cost data used for generation
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year, version)
);
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Budget plan isolation" ON budget_plans FOR ALL USING (auth.uid() = user_id);
```

### 3.4 Table: `loans`
```sql
CREATE TABLE loans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type         TEXT NOT NULL,
  lender            TEXT,
  principal_outstanding NUMERIC(15,2) NOT NULL,
  interest_rate     NUMERIC(5,2) NOT NULL,   -- annual %
  emi_amount        NUMERIC(12,2) NOT NULL,
  emis_remaining    SMALLINT NOT NULL,
  tenure_months     SMALLINT,
  down_payment      NUMERIC(12,2) DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loan isolation" ON loans FOR ALL USING (auth.uid() = user_id);
```

### 3.5 Table: `loan_strategies`
```sql
CREATE TABLE loan_strategies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type   TEXT CHECK (strategy_type IN ('avalanche','snowball','hybrid','refinance')),
  strategy_data   JSONB NOT NULL,
  ai_rationale    TEXT,
  total_saved     NUMERIC(15,2),
  months_saved    SMALLINT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loan_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strategy isolation" ON loan_strategies FOR ALL USING (auth.uid() = user_id);
```

### 3.6 Table: `user_assets`
```sql
CREATE TABLE user_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL,             -- real_estate, vehicle, gold, equity, etc.
  name            TEXT NOT NULL,
  purchase_price  NUMERIC(15,2),
  purchase_date   DATE,
  current_value   NUMERIC(15,2),
  value_source    TEXT CHECK (value_source IN ('scraped','manual','estimated')),
  last_valued_at  TIMESTAMPTZ,
  metadata        JSONB,                     -- e.g., { "location": "Mumbai", "area_sqft": 850 }
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Asset isolation" ON user_assets FOR ALL USING (auth.uid() = user_id);
```

### 3.7 Table: `investment_strategies`
```sql
CREATE TABLE investment_strategies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_score      SMALLINT NOT NULL,
  risk_profile    TEXT CHECK (risk_profile IN ('conservative','moderate','aggressive')),
  allocations     JSONB NOT NULL,            -- { "large_cap": 30, "mid_cap": 20, ... }
  investable_surplus NUMERIC(12,2),
  ai_rationale    TEXT,
  projection_data JSONB,                     -- wealth projections at 5/10/20yr
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE investment_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Strategy isolation" ON investment_strategies FOR ALL USING (auth.uid() = user_id);
```

### 3.8 Table: `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module          TEXT CHECK (module IN ('budget','loan','investment','asset','general')),
  reference_id    UUID,                      -- links to strategy/plan being questioned
  messages        JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot JSONB,                    -- compressed context at session start
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat isolation" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
```

---

## 4. API Design

### 4.1 Next.js API Routes (Auth Proxy Layer)
All routes are under `/app/api/` and require a valid Supabase session cookie.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/callback` | GET | Supabase OAuth callback handler |
| `/api/ai/stream` | POST | Streaming proxy to FastAPI AI endpoints |
| `/api/upload/file` | POST | Validates and forwards file to FastAPI |

### 4.2 FastAPI Endpoints

#### Auth & Profiles
```
POST   /v1/profile/onboard           — Save onboarding data
GET    /v1/profile/context           — Get compressed AI context for user
PATCH  /v1/profile/update            — Update profile fields
```

#### Expenses
```
POST   /v1/expenses/upload           — Upload CSV/PDF/image; returns parsed + categorized list
POST   /v1/expenses/manual           — Add single expense
GET    /v1/expenses/{month_year}     — Get expenses for a month
PATCH  /v1/expenses/{id}/category    — Override AI category
GET    /v1/expenses/summary/{months} — Aggregated summary for N months
```

#### Budget
```
POST   /v1/budget/generate           — Generate AI budget (triggers scraping)
GET    /v1/budget/{month_year}       — Get active budget for month
PATCH  /v1/budget/{id}/allocations   — Edit allocations; AI re-validates
POST   /v1/budget/chat               — Start/continue budget chat (SSE stream)
```

#### Loans
```
POST   /v1/loans/add                 — Add loan
GET    /v1/loans/all                 — List all loans
POST   /v1/loans/optimize            — Generate optimization strategy
POST   /v1/loans/chat                — Loan strategy chat (SSE stream)
```

#### Assets
```
POST   /v1/assets/add                — Add asset
GET    /v1/assets/all                — List all assets + liabilities
POST   /v1/assets/value/fetch        — Trigger market value scraping
GET    /v1/assets/{id}/projection    — Future value projection
```

#### Investments
```
POST   /v1/investment/strategy       — Generate investment plan
GET    /v1/investment/latest         — Get current strategy
POST   /v1/investment/chat           — Investment chat (SSE stream)
```

#### Chatbot
```
POST   /v1/chat/general              — General AI chat (SSE stream)
GET    /v1/chat/history              — Get chat history
```

---

## 5. AI Architecture

### 5.1 Model Selection
- **Primary:** `claude-sonnet-4-20250514` for all AI tasks
- **Fallback/Simple tasks:** `claude-haiku-4-5-20251001` for categorization and quick lookups

### 5.2 Context Management Strategy
Token efficiency is critical. The following strategy minimises token usage:

```python
# Context builder — assembles a compressed user context object
def build_user_context(user_id: str, modules: list[str]) -> dict:
    context = {
        "profile": get_profile_summary(user_id),        # ~200 tokens
        "finances": get_finance_summary(user_id),       # ~150 tokens
    }
    if "expenses" in modules:
        context["expenses"] = get_last_3_months_summary(user_id)  # ~300 tokens
    if "budget" in modules:
        context["budget"] = get_active_budget(user_id)  # ~150 tokens
    if "loans" in modules:
        context["loans"] = get_active_loans(user_id)    # ~200 tokens
    if "assets" in modules:
        context["assets"] = get_asset_summary(user_id)  # ~150 tokens
    if "investments" in modules:
        context["investments"] = get_strategy(user_id)  # ~100 tokens
    return context
```

### 5.3 System Prompt Architecture
Each module has a base system prompt + injected context. Pattern:

```
[ROLE]
You are FinSight, a personal finance advisor. You have access to the user's
complete financial profile. Be concise, data-driven, and transparent.
Always explain the reasoning behind recommendations.
Never recommend specific stocks, mutual funds, or tax advice.

[USER_CONTEXT]
{compressed_context_json}

[MODULE_INSTRUCTIONS]
{module_specific_instructions}
```

### 5.4 Streaming Implementation (SSE)
```python
# FastAPI SSE streaming endpoint pattern
@router.post("/chat/general")
async def general_chat(request: ChatRequest, user=Depends(get_current_user)):
    context = build_user_context(user.id, modules=["expenses","budget","loans"])
    
    async def stream():
        with anthropic_client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=build_system_prompt(context),
            messages=request.messages
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(stream(), media_type="text/event-stream")
```

### 5.5 Expense Categorization (Batch AI Call)
```python
# Batch categorize to minimize API calls
def categorize_expenses(expenses: list[dict]) -> list[dict]:
    prompt = f"""
    Categorize each expense below into: needs, wants, desires, or investments.
    Return ONLY a JSON array with fields: id, category, subcategory, confidence.
    
    Expenses:
    {json.dumps(expenses)}
    """
    response = claude.messages.create(
        model="claude-haiku-4-5-20251001",  # cheaper for batch classification
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(response.content[0].text)
```

---

## 6. File Processing Pipeline

### 6.1 Architecture
```
Upload → Supabase Storage → FastAPI Worker → Parse → AI Categorize → DB Insert → Response
```

### 6.2 Supported Formats & Processing

| Format | Parser | Extraction Method |
|--------|--------|-------------------|
| CSV/XLSX | pandas + openpyxl | Direct parsing; column mapping via AI |
| PDF (bank statement) | pdfplumber | Text extraction → regex + AI parsing |
| Receipt Image (JPG/PNG) | pytesseract / Google Vision | OCR → structured extraction via AI |

### 6.3 Column Mapping (CSV)
User CSV columns vary by bank. AI maps them automatically:
```python
COLUMN_MAP_PROMPT = """
Given these CSV headers: {headers}
Map them to: date, description, debit_amount, credit_amount, balance
Return JSON only.
"""
```

---

## 7. Web Scraping Architecture

### 7.1 Cost-of-Living Data
```python
# Budget generation scraping pipeline
async def scrape_city_costs(city: str, country: str) -> dict:
    sources = [
        f"https://www.numbeo.com/cost-of-living/in/{city}",
        f"https://www.expatistan.com/cost-of-living/{city}",
    ]
    # Use playwright for JS-heavy pages, httpx for static
    # Cache results in Redis for 7 days (TTL=604800)
    # Return: { rent_1bhk, groceries_monthly, transport_monthly, ... }
```

### 7.2 Asset Valuation
```python
# Asset-specific scraping
ASSET_SCRAPERS = {
    "vehicle": scrape_car_valuation,        # CarWale, CarDekho
    "gold": scrape_gold_rate,               # MCX/IBJA rates
    "real_estate": scrape_property_index,   # NHB RESIDEX, 99acres
    "equity": None,                         # user enters manually or via broker API
}
```

### 7.3 Caching Strategy
- City cost data: Redis TTL = 7 days
- Gold/commodity prices: Redis TTL = 4 hours
- Property indices: Redis TTL = 30 days
- All cache keys: `scrape:{type}:{location}:{date}`

---

## 8. Security Implementation

### 8.1 Authentication Flow
```
1. User submits credentials → Supabase Auth
2. Supabase returns JWT access_token + refresh_token
3. Next.js stores tokens in httpOnly cookies (NOT localStorage)
4. All API calls include Authorization: Bearer {access_token}
5. FastAPI verifies JWT with Supabase public key
6. Row-Level Security enforces data isolation at DB level
```

### 8.2 Supabase RLS Pattern
Every table follows this policy pattern:
```sql
-- Only the authenticated user can read/write their own data
CREATE POLICY "user_isolation" ON {table}
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 8.3 Sensitive Field Encryption
```sql
-- Income stored encrypted using pgcrypto
UPDATE user_profiles
SET monthly_income = pgp_sym_encrypt(
  income_value::text,
  current_setting('app.encryption_key')
)::numeric;

-- Decrypt in queries
SELECT pgp_sym_decrypt(monthly_income::bytea, current_setting('app.encryption_key'))
FROM user_profiles WHERE id = auth.uid();
```

### 8.4 API Key Security
- All third-party API keys stored in Railway/Vercel environment variables
- Never logged or included in responses
- Rotated every 90 days
- Access logged via Sentry for anomaly detection

---

## 9. Frontend Architecture

### 9.1 Folder Structure
```
/app
  /(auth)
    /login
    /signup
    /onboarding
  /(dashboard)
    /layout.tsx             — Auth guard + sidebar
    /page.tsx               — Home/overview
    /expenses/page.tsx
    /budget/page.tsx
    /loans/page.tsx
    /assets/page.tsx
    /investments/page.tsx
    /chat/page.tsx
  /api/
    /auth/callback/route.ts
    /ai/stream/route.ts
/components
  /ui/                      — shadcn/ui components
  /charts/                  — Recharts wrappers
  /chat/                    — Chat window components
  /upload/                  — File upload components
  /modules/                 — Feature-specific components
/lib
  /supabase/                — Client + server Supabase instances
  /ai/                      — AI context builders, prompt templates
  /hooks/                   — Custom React hooks
  /utils/                   — Formatting, calculations
/store                      — Zustand stores
/types                      — TypeScript type definitions
```

### 9.2 Auth Guard Pattern
```typescript
// app/(dashboard)/layout.tsx
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) redirect('/login')
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_complete')
    .single()
  
  if (!profile?.onboarding_complete) redirect('/onboarding')
  
  return <>{children}</>
}
```

### 9.3 Streaming Chat Hook
```typescript
// lib/hooks/useAIStream.ts
export function useAIStream(endpoint: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  
  const sendMessage = async (content: string) => {
    setIsStreaming(true)
    const response = await fetch(`/api/ai/stream`, {
      method: 'POST',
      body: JSON.stringify({ endpoint, messages: [...messages, { role: 'user', content }] })
    })
    
    const reader = response.body?.getReader()
    let assistantMessage = ''
    
    while (true) {
      const { done, value } = await reader!.read()
      if (done) break
      const chunk = new TextDecoder().decode(value)
      assistantMessage += parseSSEChunk(chunk)
      // Update state incrementally for live streaming
    }
    setIsStreaming(false)
  }
  
  return { messages, sendMessage, isStreaming }
}
```

---

## 10. Module-Specific Technical Notes

### 10.1 Expense Dashboard Charts (Recharts)
```typescript
// Colour constants — use across all charts
export const CATEGORY_COLORS = {
  needs:       '#22C55E',   // green-500
  wants:       '#3B82F6',   // blue-500
  desires:     '#F59E0B',   // amber-500
  investments: '#10B981',   // emerald-500
}
```

### 10.2 Loan Optimisation Algorithm
```python
def avalanche_strategy(loans: list[Loan], monthly_surplus: float) -> Strategy:
    """Minimum interest payment: target highest-rate loan first."""
    loans_sorted = sorted(loans, key=lambda l: l.interest_rate, reverse=True)
    schedule = []
    
    for month in range(1, max_months + 1):
        remaining_surplus = monthly_surplus
        for loan in active_loans:
            min_payment = loan.emi_amount
            extra = remaining_surplus - sum(l.emi_amount for l in active_loans) 
            payment = min_payment + (extra if loan == loans_sorted[0] else 0)
            # ... amortization logic
    
    return Strategy(
        type="avalanche",
        schedule=schedule,
        total_interest_paid=total_interest,
        months_to_closure=months,
        savings_vs_normal=normal_total - total_interest
    )
```

### 10.3 Risk Score Calculation
```python
def calculate_risk_score(profile: UserProfile, loans: list, assets: list) -> int:
    score = 50  # base
    age = calculate_age(profile.date_of_birth)
    
    # Age factor (younger = higher risk tolerance)
    score += max(0, (35 - age) * 0.8)
    
    # Income stability
    if profile.income_type == 'salaried': score += 10
    elif profile.income_type == 'self_employed': score -= 5
    
    # Dependents (more = lower risk)
    score -= profile.num_dependents * 5
    
    # Debt-to-income ratio
    dti = sum(l.emi_amount for l in loans) / profile.monthly_income
    score -= dti * 50
    
    # Asset base (more assets = higher risk tolerance)
    net_worth = sum(a.current_value for a in assets)
    if net_worth > profile.monthly_income * 60: score += 15
    
    # Experience
    exp_map = {'beginner': -10, 'intermediate': 0, 'advanced': 15}
    score += exp_map.get(profile.investment_exp, 0)
    
    return max(0, min(100, int(score)))
```

---

## 11. Performance Optimisations

### 11.1 Token Reduction Strategies
| Technique | Estimated Saving |
|-----------|-----------------|
| Summarise expense history (not raw rows) | 60–70% |
| Haiku model for classification tasks | 80% cost reduction |
| Redis cache for scraped data | Eliminates scraping latency |
| Context scoping per module | 40% fewer tokens per call |
| Compressed JSON context (no whitespace) | 10–15% |

### 11.2 Database Performance
```sql
-- Essential indexes
CREATE INDEX idx_expenses_user_month   ON expenses(user_id, month_year DESC);
CREATE INDEX idx_expenses_category     ON expenses(user_id, category);
CREATE INDEX idx_chat_sessions_user    ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_loans_user_active     ON loans(user_id) WHERE is_active = TRUE;
```

### 11.3 Frontend Performance
- Next.js App Router with React Server Components for data fetching
- Suspense + loading skeletons for all data-dependent components
- Chart data memoized with `useMemo`; avoid re-renders on chat updates
- File uploads streamed via multipart form; no base64 in-memory encoding

---

## 12. Environment Variables

### Next.js (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
```

### FastAPI (Railway env)
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only, never exposed
ANTHROPIC_API_KEY=
GOOGLE_VISION_API_KEY=
REDIS_URL=
APP_ENCRYPTION_KEY=               # for pgcrypto
SCRAPING_PROXY_URL=               # optional: rotating proxy for scraping
```

---

## 13. Deployment Architecture

### 13.1 CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install pytest && pytest backend/tests/
  
  test-frontend:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm run test
  
  deploy-frontend:
    needs: [test-frontend]
    uses: vercel/actions@v1
  
  deploy-backend:
    needs: [test-backend]
    uses: railway deploy
```

### 13.2 Supabase Migration Strategy
```
/supabase/migrations/
  001_initial_schema.sql
  002_add_rls_policies.sql
  003_add_indexes.sql
  004_add_pgcrypto.sql
```
Run via: `supabase db push` on each deploy.

---

## 14. Error Handling Standards

### 14.1 Backend Error Response Schema
```python
class APIError(BaseModel):
    code: str           # e.g., "INSUFFICIENT_CONTEXT"
    message: str        # user-friendly
    detail: str | None  # dev-friendly, not shown in UI
    
# Always return structured errors
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content=APIError(
            code="INTERNAL_ERROR",
            message="Something went wrong. Please try again.",
            detail=str(exc) if settings.debug else None
        ).model_dump()
    )
```

### 14.2 AI Fallback Strategy
```python
# If Claude API is unavailable, return graceful degradation
try:
    response = await call_claude(prompt)
except anthropic.APIError:
    return {
        "status": "ai_unavailable",
        "message": "AI analysis is temporarily unavailable. Your data has been saved.",
        "data": raw_data_without_ai_insights
    }
```
