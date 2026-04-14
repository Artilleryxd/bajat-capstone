---
name: ai-context
description: >
  Use this skill when building AI prompts, assembling context payloads for Claude,
  creating streaming SSE endpoints, choosing between Haiku and Sonnet models,
  writing system prompts, or optimising token usage for any AI feature in FinSight AI.
triggers:
  - "AI prompt"
  - "system prompt"
  - "context builder"
  - "streaming"
  - "SSE"
  - "claude"
  - "token"
  - "anthropic"
  - "haiku"
  - "sonnet"
  - "chat endpoint"
---

# FinSight AI — AI Context & Streaming Skill

## Model Selection Rule
```
Classification tasks  → claude-haiku-4-5-20251001   (fast, cheap)
Reasoning/chat tasks  → claude-sonnet-4-20250514    (accurate, nuanced)
```

| Task | Model |
|------|-------|
| Categorize expenses (batch) | Haiku |
| Map CSV column headers | Haiku |
| Generate budget plan | Sonnet |
| Loan optimization strategy | Sonnet |
| Investment risk + allocation | Sonnet |
| Any user chat response | Sonnet |

---

## Context Builder (always use this, never inline)
```python
# backend/app/services/context_builder.py

def build_user_context(user_id: str, modules: list[str]) -> dict:
    """
    Assemble compressed AI context. Only include modules needed for the task.
    Target: < 1200 tokens total context payload.
    """
    context = {
        "profile": get_profile_summary(user_id),        # ~200 tokens
        "finances": get_finance_summary(user_id),       # ~150 tokens
    }
    if "expenses" in modules:
        context["expenses"] = get_last_3_months_summary(user_id)   # ~300 tokens
    if "budget" in modules:
        context["budget"] = get_active_budget_summary(user_id)     # ~150 tokens
    if "loans" in modules:
        context["loans"] = get_active_loans_summary(user_id)       # ~200 tokens
    if "assets" in modules:
        context["assets"] = get_asset_summary(user_id)             # ~150 tokens
    if "investments" in modules:
        context["investments"] = get_strategy_summary(user_id)     # ~100 tokens
    return context

# Module scope map — always reference this
CONTEXT_SCOPE = {
    "budget":     ["profile", "finances", "expenses"],
    "loans":      ["profile", "finances", "loans", "assets"],
    "investment": ["profile", "finances", "loans", "assets", "investments"],
    "expenses":   ["profile", "expenses"],
    "general":    ["profile", "finances", "expenses", "budget", "loans"],
}
```

---

## System Prompt Template
```python
SYSTEM_PROMPT = """
You are FinSight, a personal AI finance advisor. You have access to the user's
complete financial profile below.

RULES:
- NEVER recommend specific stocks, mutual funds, ETFs, or securities by name
- NEVER provide tax advice
- ALWAYS explain your reasoning in plain language
- Be concise — 3–4 paragraphs maximum unless the user asks for detail
- If asked something outside finance, acknowledge and redirect

USER FINANCIAL CONTEXT:
{context_json}

CURRENT MODULE: {module}
{module_instructions}

DISCLAIMER: FinSight provides general financial information, not regulated advice.
"""
```

---

## Streaming SSE Endpoint Pattern
```python
# backend/app/routers/chat.py
from fastapi.responses import StreamingResponse
import anthropic, json

anthropic_client = anthropic.AsyncAnthropic()

@router.post("/chat/{module}")
async def module_chat(
    module: str,
    request: ChatRequest,
    user = Depends(get_current_user)
):
    scope = CONTEXT_SCOPE.get(module, ["profile", "finances"])
    context = build_user_context(user.id, scope)
    system = SYSTEM_PROMPT.format(
        context_json=json.dumps(context, separators=(',', ':')),  # compact JSON
        module=module,
        module_instructions=MODULE_INSTRUCTIONS[module]
    )

    async def event_stream():
        async with anthropic_client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system,
            messages=request.messages
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

## Frontend Streaming Hook
```typescript
// lib/hooks/useAIStream.ts
export function useAIStream(module: string, referenceId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const send = async (content: string) => {
    const userMsg: Message = { role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    const res = await fetch(`/api/ai/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, referenceId, messages: [...messages, userMsg] })
    })

    const reader = res.body!.getReader()
    let assistantText = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = new TextDecoder().decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          const { text } = JSON.parse(line.slice(6))
          assistantText += text
          setMessages(prev => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: assistantText }
          ])
        }
      }
    }
    setIsStreaming(false)
  }

  return { messages, send, isStreaming }
}
```

---

## Batch Classification (Haiku)
```python
# For expense categorization — always batch, never one-at-a-time
def categorize_expenses_batch(expenses: list[dict]) -> list[dict]:
    prompt = f"""
Categorize each expense. Return ONLY a JSON array, no other text.
Each item: {{ "id": str, "category": "needs"|"wants"|"desires"|"investments",
              "subcategory": str, "confidence": float 0-1 }}

Expenses:
{json.dumps(expenses, separators=(',', ':'))}
"""
    response = anthropic.Anthropic().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(response.content[0].text)
```

---

## Token Budget Guidelines
| Concern | Budget |
|---------|--------|
| System prompt (base) | ~300 tokens |
| User context payload | < 1200 tokens |
| Chat history (passed) | Last 10 messages only |
| AI response max_tokens | 1024 (chat) / 2048 (plan generation) |
| **Total per call** | **< 3600 tokens** |

Always use compact JSON (`separators=(',',':')`) for context payloads.
Summarise expense history — never pass raw transaction rows.
