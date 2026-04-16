"""Expense business logic — parsing, categorization, and database operations."""

import logging
import os
import tempfile
from datetime import date
from uuid import uuid4

from fastapi import UploadFile

from db.supabase_client import supabase_admin
from services.ai_categorizer import (
    categorize_expenses_batch,
    ai_map_columns,
    ai_parse_statement_text,
    ai_extract_receipt,
)
from services.file_parser import (
    parse_csv,
    parse_pdf,
    parse_image,
    get_csv_headers,
)

logger = logging.getLogger(__name__)


async def create_manual_expense(user_id: str, data: dict) -> dict:
    """
    Create a single manual expense.
    Optionally AI-categorizes if no category is provided.
    """
    category = data.get("category")
    subcategory = None
    confidence = None
    merchant = None

    # If user provided a category, skip AI
    if category:
        confidence = 1.0
    else:
        # Try AI categorization
        ai_results = categorize_expenses_batch([{
            "id": "manual",
            "description": data["description"],
            "amount": data["amount"],
        }])
        if ai_results:
            r = ai_results[0]
            category = r.get("category")
            subcategory = r.get("subcategory")
            confidence = r.get("confidence")
            merchant = r.get("merchant")

    # Normalize legacy "desires" → "wants"
    if category == "desires":
        category = "wants"

    expense_date = data.get("expense_date", date.today().isoformat())
    if isinstance(expense_date, date):
        expense_date = expense_date.isoformat()

    # Parse expense_date to compute month_year
    try:
        ed = date.fromisoformat(expense_date)
        month_year = date(ed.year, ed.month, 1).isoformat()
    except (ValueError, TypeError):
        month_year = date(date.today().year, date.today().month, 1).isoformat()

    row = {
        "user_id": user_id,
        "description": data["description"],
        "amount": float(data["amount"]),
        "category": category,
        "subcategory": subcategory,
        "merchant": merchant,
        "source": "manual",
        "ai_confidence": confidence,
        "user_override": False,
        "expense_date": expense_date,
        "month_year": month_year,
    }

    try:
        result = supabase_admin.table("expenses").insert(row).execute()
        if result.data:
            return result.data[0]
        return row
    except Exception as e:
        logger.error("Failed to insert manual expense: %s", e)
        raise


async def process_upload(user_id: str, file: UploadFile, file_type: str) -> list[dict]:
    """
    Process an uploaded file: parse → AI categorize → return preview.
    Does NOT save to DB yet (user must confirm).
    """
    # Save file temporarily
    suffix_map = {
        "csv": ".csv",
        "excel": ".xlsx",
        "pdf": ".pdf",
        "image": ".jpg",
    }
    suffix = suffix_map.get(file_type, ".tmp")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Step 1: Parse file
        raw_transactions: list[dict] = []

        if file_type in ("csv", "excel"):
            # Try AI column mapping first
            headers = get_csv_headers(tmp_path)
            column_mapping = None
            if headers:
                column_mapping = ai_map_columns(headers)
            raw_transactions = parse_csv(tmp_path, column_mapping)

        elif file_type == "pdf":
            raw_transactions = parse_pdf(tmp_path)

        elif file_type == "image":
            raw_transactions = parse_image(tmp_path)

        # Step 2: Handle raw text from PDF/image that needs AI parsing
        parsed_transactions: list[dict] = []
        for item in raw_transactions:
            if item.get("needs_ai_parsing"):
                raw_text = item.get("raw_text", "")
                if raw_text and raw_text != "OCR libraries not available":
                    if file_type == "image":
                        # Extract receipt data
                        receipt = ai_extract_receipt(raw_text)
                        if receipt:
                            parsed_transactions.append({
                                "id": str(uuid4()),
                                "description": ", ".join(receipt.get("items", ["Purchase"])),
                                "amount": receipt.get("amount", 0),
                                "date": receipt.get("date", ""),
                                "merchant": receipt.get("merchant"),
                            })
                        else:
                            # Fallback: single item with raw text
                            parsed_transactions.append({
                                "id": str(uuid4()),
                                "description": raw_text[:200],
                                "amount": 0,
                                "date": "",
                            })
                    else:
                        # PDF text parsing
                        ai_parsed = ai_parse_statement_text(raw_text)
                        for t in ai_parsed:
                            parsed_transactions.append({
                                "id": str(uuid4()),
                                "description": t.get("description", "Unknown"),
                                "amount": abs(float(t.get("amount", 0))),
                                "date": t.get("date", ""),
                            })
            else:
                parsed_transactions.append(item)

        if not parsed_transactions:
            return []

        # Step 3: AI categorization
        expenses_for_ai = [
            {"id": t["id"], "description": t["description"], "amount": t["amount"]}
            for t in parsed_transactions
        ]
        ai_results = categorize_expenses_batch(expenses_for_ai)

        # Merge AI results
        ai_map = {r["id"]: r for r in ai_results}
        for t in parsed_transactions:
            ai_data = ai_map.get(t["id"], {})
            t["category"] = ai_data.get("category")
            t["subcategory"] = ai_data.get("subcategory")
            t["confidence"] = ai_data.get("confidence")
            if not t.get("merchant"):
                t["merchant"] = ai_data.get("merchant")
            t["source"] = file_type if file_type != "excel" else "csv"

        # Filter out income items (salary, deposits, refunds, etc.)
        expense_only = [
            t for t in parsed_transactions
            if t.get("category") != "income"
        ]
        income_count = len(parsed_transactions) - len(expense_only)
        if income_count > 0:
            logger.info("Filtered out %d income transactions", income_count)

        logger.info("Processed %d expense transactions from %s upload", len(expense_only), file_type)
        return expense_only

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


async def confirm_expenses(user_id: str, expenses: list[dict]) -> int:
    """
    Bulk insert confirmed expenses into the database.
    Returns count of inserted rows.
    """
    rows = []
    for e in expenses:
        expense_date = e.get("date") or e.get("expense_date") or date.today().isoformat()

        # Compute month_year
        try:
            if isinstance(expense_date, str):
                ed = date.fromisoformat(expense_date)
            else:
                ed = expense_date
            month_year = date(ed.year, ed.month, 1).isoformat()
        except (ValueError, TypeError):
            month_year = date(date.today().year, date.today().month, 1).isoformat()
            expense_date = date.today().isoformat()

        # Normalize legacy "desires" → "wants"
        cat = e.get("category")
        if cat == "desires":
            cat = "wants"

        rows.append({
            "user_id": user_id,
            "description": e.get("description", "Unknown"),
            "amount": abs(float(e.get("amount", 0))),
            "category": cat,
            "subcategory": e.get("subcategory"),
            "merchant": e.get("merchant"),
            "source": e.get("source", "manual"),
            "ai_confidence": e.get("confidence"),
            "user_override": e.get("user_override", False),
            "expense_date": expense_date if isinstance(expense_date, str) else expense_date.isoformat(),
            "month_year": month_year,
        })

    if not rows:
        return 0

    try:
        supabase_admin.table("expenses").insert(rows).execute()
        logger.info("Inserted %d expenses for user %s", len(rows), user_id)
        return len(rows)
    except Exception as e:
        logger.error("Failed to bulk insert expenses: %s", e)
        raise


async def get_monthly_expenses(user_id: str, month_year: str) -> dict:
    """
    Fetch expenses for a given month_year (format: YYYY-MM-DD, always 1st of month).
    Returns expenses list + category summary.
    """
    try:
        result = (
            supabase_admin
            .table("expenses")
            .select("*")
            .eq("user_id", user_id)
            .eq("month_year", month_year)
            .order("expense_date", desc=True)
            .execute()
        )
        expenses = result.data or []
    except Exception as e:
        logger.error("Failed to fetch expenses: %s", e)
        expenses = []

    # Build category summary — desires is folded into wants
    summary: dict = {
        "total": 0,
        "categories": {
            "needs": {"total": 0, "count": 0},
            "wants": {"total": 0, "count": 0},
            "investments": {"total": 0, "count": 0},
            "repayments": {"total": 0, "count": 0},
        },
    }
    for exp in expenses:
        amount = float(exp.get("amount", 0))
        summary["total"] += amount
        cat = exp.get("category")
        # Normalize legacy desires rows stored before the migration
        if cat == "desires":
            cat = "wants"
        if cat and cat in summary["categories"]:
            summary["categories"][cat]["total"] += amount
            summary["categories"][cat]["count"] += 1

    return {
        "month_year": month_year,
        "expenses": expenses,
        "summary": summary,
    }
