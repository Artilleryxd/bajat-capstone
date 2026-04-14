# FinSight AI — AI Service Guidelines

## Core Principle

AI is used **only** for plain-language explanation. It **never** performs calculations or overrides algorithmic results from the deterministic simulation engine.

## AI MAY

- Explain why the chosen strategy is optimal
- Mention interest saved and time saved using concrete numbers from the calculation results
- Describe the difference between avalanche and snowball strategies
- Briefly address refinancing if the highest interest rate exceeds 12%
- Briefly address invest-vs-prepay if monthly surplus > 2× EMIs and max rate < 10%
- If surplus is 0, explain that strategies produce similar results without extra and suggest creating a surplus

## AI MUST NOT

- Perform any calculations
- Override deterministic results
- Name specific lenders, stocks, mutual funds, or tax instruments
- Give tax advice

## Implementation

- All Anthropic API calls live in `backend/services/ai_service.py`
- Uses **Claude Sonnet** (for reasoning tasks)
- Context is assembled compactly via `backend/services/context_builder.py`
