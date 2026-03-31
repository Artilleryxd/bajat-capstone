# Project Requirements Document (PRD)
## Personal Finance Assistant — FinSight AI
**Version:** 1.0  
**Date:** March 2026  
**Status:** Draft  

---

## 1. Executive Summary

FinSight AI is a full-stack, AI-driven personal finance assistant built on Next.js, Python, and Supabase. It empowers users to take control of their financial life through automated expense categorization, smart budgeting, loan optimization, asset tracking, investment planning, and a conversational AI advisor — all context-aware and personalized to each user's demographic and financial profile.

---

## 2. Goals & Objectives

| Goal | Description |
|------|-------------|
| Personalization | Every AI interaction is grounded in the user's real financial data |
| Transparency | Users can question every AI decision through a chat interface |
| Automation | Minimize manual input; leverage scraping, OCR, and AI parsing |
| Compliance | All stored data adheres to GDPR, DPDP (India), and SOC 2 principles |
| Performance | Sub-2s AI response times; minimal token consumption |

---

## 3. User Personas

### 3.1 Primary Persona — The Young Professional
- Age 22–35, salaried or self-employed
- Has EMIs, savings goals, and monthly expenses to manage
- Wants automation, not spreadsheets

### 3.2 Secondary Persona — The Family Breadwinner
- Age 35–50, married with dependents
- Managing home loan, children's education, retirement planning
- Needs investment guidance and loan optimization

### 3.3 Tertiary Persona — The First-Time Earner
- Age 20–24, first job
- No financial literacy; needs guided onboarding and basic budgeting

---

## 4. Functional Requirements

### 4.1 Authentication & User Onboarding

#### 4.1.1 Authentication
- **FR-AUTH-01:** The system shall check for an active Supabase session on every page load.
- **FR-AUTH-02:** Unauthenticated users shall be redirected to a Sign Up / Login screen.
- **FR-AUTH-03:** Authentication shall use Supabase Auth with email/password as the primary method.
- **FR-AUTH-04:** OAuth login (Google) shall be supported as a secondary method.
- **FR-AUTH-05:** Session persistence shall use Supabase JWT refresh tokens.

#### 4.1.2 Financial Onboarding (First Login Only)
- **FR-ONB-01:** Upon first successful registration, a multi-step onboarding wizard shall be presented before the user can access the dashboard.
- **FR-ONB-02:** Step 1 — Personal Details: Full name, date of birth, gender, country, city/neighbourhood.
- **FR-ONB-03:** Step 2 — Financial Profile: Monthly gross income, income type (salaried/self-employed/freelance), currency.
- **FR-ONB-04:** Step 3 — Household: Marital status, number of dependents, housing status (owned/rented/family).
- **FR-ONB-05:** Step 4 — Optional: Existing loans (Y/N), investment experience (beginner/intermediate/advanced).
- **FR-ONB-06:** All onboarding data shall be stored in the `user_profiles` table in Supabase.
- **FR-ONB-07:** The system shall mark `onboarding_complete = true` in the user record upon completion.
- **FR-ONB-08:** Onboarding data shall be used as persistent AI context for all modules.

---

### 4.2 Expense Categorizer

#### 4.2.1 Data Input
- **FR-EXP-01:** Users shall be able to upload expenses via:
  - CSV/Excel spreadsheet upload
  - PDF bank statement upload
  - Receipt image upload (JPEG/PNG)
  - Manual entry form
- **FR-EXP-02:** The system shall use OCR (Tesseract/Google Vision) for receipt and PDF parsing.
- **FR-EXP-03:** The system shall use AI to infer expense category, merchant name, and amount from unstructured input.

#### 4.2.2 Categorization
- **FR-EXP-04:** The AI shall automatically categorize each expense into one of four buckets:
  - **Needs** (essentials: rent, groceries, medicine, utilities) — Color: `#22C55E` (Green)
  - **Wants** (lifestyle: dining out, subscriptions, clothing) — Color: `#3B82F6` (Blue)
  - **Desires** (luxuries: travel, gadgets, entertainment) — Color: `#F59E0B` (Amber/Orange)
  - **Investments** (SIP, stocks, PPF, FD) — Color: `#10B981` (Emerald)
- **FR-EXP-05:** Users shall be able to override any AI-assigned category.
- **FR-EXP-06:** The system shall learn from user overrides and apply corrections to future categorizations.

#### 4.2.3 Storage & Dashboard
- **FR-EXP-07:** Expenses shall be stored in the `expenses` table with a `month_year` partition key.
- **FR-EXP-08:** The dashboard shall display:
  - Donut chart: breakdown by category (colour-coded)
  - Bar chart: month-over-month comparison
  - Line chart: spending trend per category over 6 months
  - Summary cards: total spend, biggest category, savings rate
- **FR-EXP-09:** The dashboard shall support filtering by month, category, and amount range.
- **FR-EXP-10:** All expense data shall be passed as context to the AI chatbot module.

---

### 4.3 Smart Budget Planner

#### 4.3.1 Budget Generation
- **FR-BUD-01:** The system shall automatically generate a monthly budget upon first login using:
  - User income and household data (from onboarding)
  - Average rent, cost of living, and transport costs for the user's city (scraped from the web)
  - AI allocation logic
- **FR-BUD-02:** Budget allocation shall cover: Rent, Groceries, Transport, Bills & Utilities, Healthcare, Investments, Emergency Fund, Dining Out/Entertainment, Clothing, Miscellaneous.
- **FR-BUD-03:** The system shall scrape current average costs from public sources (Numbeo, Expatistan, or similar) for the user's city/neighbourhood.
- **FR-BUD-04:** The AI shall generate a rationale for every budget line item.
- **FR-BUD-05:** Users shall be able to edit any budget line and the AI shall re-validate the plan.

#### 4.3.2 Budget vs. Actuals
- **FR-BUD-06:** The dashboard shall compare the allocated budget against actual expenses for the current month.
- **FR-BUD-07:** Over-budget categories shall be visually flagged in red with an AI-generated recommendation.

#### 4.3.3 AI Chat for Budget
- **FR-BUD-08:** A "Question this budget" button shall open a context-aware chat window.
- **FR-BUD-09:** The chat window shall have access to: user profile, expense history, current budget plan.
- **FR-BUD-10:** Budget plans shall be stored in the `budget_plans` table with version history.

---

### 4.4 Loan Optimisation System

#### 4.4.1 Loan Data Input
- **FR-LOAN-01:** Users shall be able to add one or more loans with: loan type, principal outstanding, interest rate (%), EMI amount, number of EMIs remaining, tenure, down payment (if applicable).
- **FR-LOAN-02:** Supported loan types: Home Loan, Car Loan, Personal Loan, Education Loan, Credit Card Debt, Buy-Now-Pay-Later.

#### 4.4.2 Optimisation Strategy
- **FR-LOAN-03:** The AI shall generate a debt-closure strategy using either:
  - **Avalanche Method:** Highest interest rate first (mathematically optimal)
  - **Snowball Method:** Smallest balance first (psychologically optimal)
  - **Hybrid Method:** AI-determined based on user profile
- **FR-LOAN-04:** The system shall calculate and compare: total interest payable under current plan vs. optimised plan, time saved, and money saved.
- **FR-LOAN-05:** If investment returns (estimated) exceed loan interest rate, the AI shall recommend investing surplus instead of prepaying.
- **FR-LOAN-06:** If income is insufficient for accelerated repayment, the system shall prompt the user to list owned assets and shall recommend a refinancing strategy (balance transfer or secured loan at lower rate).

#### 4.4.3 Storage & AI Chat
- **FR-LOAN-07:** Each strategy shall be stored in `loan_strategies` with a unique version ID.
- **FR-LOAN-08:** A "Question this plan" chat window shall be available per strategy, and chat history shall be saved alongside the strategy record.
- **FR-LOAN-09:** Loan data shall be used as AI context across all modules.

---

### 4.5 Asset & Liability Tracker

#### 4.5.1 Asset Input
- **FR-ASSET-01:** Users shall be able to add assets of the following types: Real Estate, Vehicle, Gold/Jewellery, Bank Deposits (FD/RD), Equity/Mutual Funds, Provident Fund, Business Equity, Other.
- **FR-ASSET-02:** For each asset, users shall enter: name, purchase price, purchase date, and optionally current market value.
- **FR-ASSET-03:** The system shall attempt to fetch the current estimated value of assets (for eligible types) by scraping public sources (e.g., property price indices, vehicle valuation APIs, gold rates).
- **FR-ASSET-04:** Users shall be able to manually override the current value.

#### 4.5.2 Liability Input
- **FR-ASSET-05:** Liabilities shall be auto-populated from the Loan Optimisation module.
- **FR-ASSET-06:** Additional liabilities (informal debts, credit card outstanding) can be added manually.

#### 4.5.3 Dashboard & Drill-down
- **FR-ASSET-07:** The dashboard shall display: total net worth (assets − liabilities), asset allocation by type (pie chart), net worth trend over time (line chart).
- **FR-ASSET-08:** Clicking on any asset shall open a drill-down view showing: purchase value, current value, appreciation/depreciation (%), projected value at 1/3/5/10 years.
- **FR-ASSET-09:** Asset data shall be stored in `user_assets` and `user_liabilities` tables and used as AI context for loan optimisation and investment planning.

---

### 4.6 Investment Strategy Planner

#### 4.6.1 Risk Profiling
- **FR-INV-01:** The system shall calculate a risk score (0–100) based on: age, income, number of dependents, existing liabilities, investment experience, time horizon, and asset base.
- **FR-INV-02:** The risk score shall map to a profile: Conservative (0–30), Moderate (31–60), Aggressive (61–100).

#### 4.6.2 Strategy Generation
- **FR-INV-03:** The AI shall generate an allocation strategy for the user's investable surplus (income minus expenses minus EMIs minus emergency fund).
- **FR-INV-04:** Strategy output shall be in the form of allocation percentages across asset classes: Large Cap Equity, Mid Cap Equity, Small Cap Equity, Flexi/Multi Cap, Debt Funds, Gold, International Equity, REITs, Liquid Funds. No specific stocks, mutual fund names, or securities shall be recommended (regulatory compliance).
- **FR-INV-05:** The system shall provide rationale for each allocation and a projected wealth scenario at 5/10/20 years.
- **FR-INV-06:** A "Question this strategy" chat window shall be available.
- **FR-INV-07:** Investment strategies shall be stored in `investment_strategies`.

---

### 4.7 General AI Chatbot

- **FR-CHAT-01:** A persistent chatbot shall be accessible from all screens via a floating button.
- **FR-CHAT-02:** The chatbot shall have full context of: user profile, current month expenses, budget plan, active loans, asset/liability summary, and investment strategy.
- **FR-CHAT-03:** The chatbot shall support follow-up questions, corrections, and scenario queries (e.g., "What if I get a 20% salary hike?").
- **FR-CHAT-04:** Chat history shall be stored in `chat_sessions` per user with timestamps.
- **FR-CHAT-05:** The chatbot shall never provide direct stock recommendations or tax advice; it shall clearly disclaim its advisory nature.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-PERF-01:** AI response time (first token) shall be under 1.5 seconds for simple queries.
- **NFR-PERF-02:** Dashboard page load shall be under 2 seconds on a standard broadband connection.
- **NFR-PERF-03:** Token usage per AI call shall be minimised through context summarisation and caching.

### 5.2 Security
- **NFR-SEC-01:** All data in transit shall use TLS 1.3.
- **NFR-SEC-02:** All data at rest in Supabase shall be AES-256 encrypted.
- **NFR-SEC-03:** Row-Level Security (RLS) shall be enabled on all Supabase tables.
- **NFR-SEC-04:** No financial data shall be stored in client-side localStorage or cookies.
- **NFR-SEC-05:** API keys (Anthropic, scraping services) shall never be exposed to the client.
- **NFR-SEC-06:** PII fields (income, assets) shall be stored with field-level encryption using pgcrypto.

### 5.3 Compliance
- **NFR-COM-01:** The application shall include a Privacy Policy and Terms of Service.
- **NFR-COM-02:** Users shall be able to export or delete all their data (GDPR/DPDP right to erasure).
- **NFR-COM-03:** The AI chatbot shall include a financial disclaimer on first use.
- **NFR-COM-04:** Investment recommendations shall comply with SEBI guidelines (no specific securities recommended).

### 5.4 Scalability
- **NFR-SCALE-01:** The system shall support up to 10,000 concurrent users with auto-scaling on Vercel/Railway.
- **NFR-SCALE-02:** AI context payloads shall be summarised/compressed for users with large data histories.

### 5.5 Accessibility
- **NFR-ACC-01:** The application shall meet WCAG 2.1 AA standards.
- **NFR-ACC-02:** All charts shall include accessible text alternatives.

---

## 6. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | New user | Complete onboarding in under 5 minutes | The AI knows my financial context immediately |
| US-02 | User | Upload my bank statement PDF | I don't have to manually enter 50 transactions |
| US-03 | User | See my needs vs wants breakdown | I can identify where I'm overspending |
| US-04 | User | Ask the AI why it allocated ₹15k to rent | I understand and trust the budget |
| US-05 | User | See my cheapest path to loan closure | I can save money on interest |
| US-06 | User | See my net worth at a glance | I can track financial progress over time |
| US-07 | User | Get an investment allocation plan | I know how to deploy my savings wisely |
| US-08 | User | Ask the chatbot "Am I on track?" | I get instant personalised feedback |

---

## 7. Out of Scope (v1.0)

- Direct bank account integration (Plaid, Account Aggregator)
- Tax filing or ITR assistance
- Insurance recommendations
- Crypto or NFT tracking
- Multi-currency portfolio tracking

---

## 8. Assumptions & Dependencies

- Users have a stable internet connection.
- Scraping services (Numbeo, etc.) remain publicly accessible.
- Anthropic Claude API is used as the AI backbone.
- Supabase is the sole database and auth provider.
- The application is deployed on Vercel (frontend) and Railway/Render (Python backend).
