---
name: expense-categorizer
description: >
  Use this skill when building the expense categorization feature: file upload
  handling (CSV, PDF, receipt images), OCR processing, AI batch categorization,
  the expense dashboard with charts, or the monthly expense storage pipeline.
triggers:
  - "expense"
  - "categorize"
  - "upload expenses"
  - "csv upload"
  - "receipt"
  - "pdf bank statement"
  - "OCR"
  - "needs wants desires"
  - "expense dashboard"
  - "spending"
---

# FinSight AI — Expense Categorizer Skill

## Category System
| Category | Colour | Hex | Examples |
|----------|--------|-----|---------|
| needs | Green | `#22C55E` | Rent, groceries, medicine, utilities, commute |
| wants | Blue | `#3B82F6` | Dining out, streaming, non-essential clothing |
| desires | Amber | `#F59E0B` | Travel, gadgets, luxury, entertainment |
| investments | Emerald | `#10B981` | SIP, stocks, FD, PPF, NPS, crypto |

```typescript
// Always import from this shared constant — never hardcode hex values inline
export const CATEGORY_COLORS = {
  needs:       '#22C55E',
  wants:       '#3B82F6',
  desires:     '#F59E0B',
  investments: '#10B981',
} as const
export type ExpenseCategory = keyof typeof CATEGORY_COLORS
```

---

## File Upload Pipeline
```
1. User drops file → react-dropzone validates type + size (max 10MB)
2. POST multipart form → /api/upload (Next.js route) → forwards to FastAPI
3. FastAPI saves to Supabase Storage: /uploads/{user_id}/{uuid}_{filename}
4. Parse by type:
   - CSV/XLSX  → pandas
   - PDF       → pdfplumber → text → AI extraction
   - Image     → pytesseract (or Google Vision) → AI extraction
5. AI batch categorization (Haiku model)
6. Return preview list to frontend
7. User reviews and confirms
8. Bulk INSERT into expenses table
9. Delete raw file from Supabase Storage (never store bank statements)
```

## CSV Parsing with AI Column Mapping
```python
# backend/app/services/file_parser.py
import pandas as pd

COLUMN_MAP_PROMPT = """
These are CSV headers from a bank statement: {headers}
Map them to these fields (return JSON only, no text):
{{ "date": "header_name", "description": "header_name",
   "debit": "header_name", "credit": "header_name", "balance": "header_name|null" }}
"""

def parse_csv(filepath: str) -> list[dict]:
    df = pd.read_csv(filepath)
    headers = list(df.columns)

    # Use Haiku to map columns
    mapping = ai_map_columns(headers)  # calls Haiku with COLUMN_MAP_PROMPT

    transactions = []
    for _, row in df.iterrows():
        amount = row.get(mapping['debit']) or -row.get(mapping['credit'], 0)
        if pd.notna(amount) and amount != 0:
            transactions.append({
                "id": str(uuid4()),
                "description": str(row[mapping['description']]),
                "amount": abs(float(amount)),
                "date": str(row[mapping['date']]),
                "type": "debit" if float(amount) > 0 else "credit"
            })
    return transactions
```

## PDF Bank Statement Parsing
```python
import pdfplumber, re

def parse_pdf_statement(filepath: str) -> list[dict]:
    transactions = []
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            # Try table extraction first
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    transactions.extend(parse_table_rows(table))
            else:
                # Fall back to AI text parsing if no tables found
                transactions.extend(ai_parse_statement_text(text))
    return transactions
```

## Receipt OCR
```python
import pytesseract
from PIL import Image

def parse_receipt_image(filepath: str) -> dict:
    img = Image.open(filepath)
    text = pytesseract.image_to_string(img)

    # Use Haiku to extract structured data from raw OCR text
    prompt = f"""
Extract from this receipt text. Return JSON only:
{{ "merchant": str, "amount": float, "date": "YYYY-MM-DD"|null, "items": [str] }}

Receipt text:
{text[:2000]}  # truncate to save tokens
"""
    return ai_extract_receipt(prompt)
```

---

## month_year Convention (CRITICAL)
```python
# ALWAYS store month_year as the FIRST day of the month
from datetime import date

month_year = date(expense_date.year, expense_date.month, 1)
# e.g. any date in March 2026 → 2026-03-01

# SQL equivalent:
# month_year = date_trunc('month', expense_date::date)::date
```

## Bulk Insert Pattern
```python
# backend/app/routers/expenses.py
@router.post("/expenses/confirm")
async def confirm_expenses(body: ConfirmExpensesRequest, user = Depends(get_current_user)):
    rows = [
        {
            "user_id": user.id,
            "month_year": date(e.expense_date.year, e.expense_date.month, 1).isoformat(),
            "description": e.description,
            "amount": e.amount,
            "category": e.category,
            "subcategory": e.subcategory,
            "source": e.source,
            "ai_confidence": e.confidence,
            "expense_date": e.expense_date.isoformat(),
        }
        for e in body.expenses
    ]
    supabase.table("expenses").insert(rows).execute()
    return {"inserted": len(rows)}
```

---

## Dashboard Chart Components
```typescript
// components/charts/ExpenseDonut.tsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CATEGORY_COLORS } from '@/lib/constants'

export function ExpenseDonut({ data }: { data: CategorySummary[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="category" innerRadius={60}>
          {data.map(entry => (
            <Cell key={entry.category}
                  fill={CATEGORY_COLORS[entry.category as ExpenseCategory]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

## Required Dashboard Widgets
1. **Donut chart** — category breakdown (colour-coded)
2. **Bar chart** — month-over-month by category (last 6 months)
3. **Line chart** — spending trend per category over time
4. **Summary cards** — Total spend · Biggest category · Savings rate · Month vs budget
5. **Filter bar** — by month, category, amount range
6. **Expense table** — with override category button per row
