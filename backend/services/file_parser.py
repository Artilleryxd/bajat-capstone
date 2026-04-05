"""File parsing service for CSV, PDF, and image uploads."""

import logging
from uuid import uuid4
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


def parse_csv(filepath: str, column_mapping: Optional[dict] = None) -> list[dict]:
    """
    Parse a CSV or Excel file into normalized transaction dicts.
    
    If column_mapping is provided (from AI), use it. Otherwise attempt
    heuristic detection of common column names.
    """
    try:
        if filepath.endswith((".xlsx", ".xls")):
            df = pd.read_excel(filepath)
        else:
            df = pd.read_csv(filepath)
    except Exception as e:
        logger.error("Failed to read CSV/Excel file: %s", e)
        return []

    headers = list(df.columns)
    logger.info("CSV headers detected: %s", headers)

    if column_mapping:
        mapping = column_mapping
    else:
        mapping = _heuristic_column_mapping(headers)

    if not mapping:
        logger.warning("Could not map CSV columns, returning raw rows")
        return _fallback_parse(df)

    transactions: list[dict] = []
    for _, row in df.iterrows():
        try:
            # Only use debit/withdrawal column — credit rows are income, not expenses
            amount = None
            is_credit = False

            if mapping.get("debit") and mapping["debit"] in df.columns:
                val = row.get(mapping["debit"])
                if pd.notna(val) and float(val) != 0:
                    amount = abs(float(val))

            # Check if this row is a credit (income) entry
            if mapping.get("credit") and mapping["credit"] in df.columns:
                credit_val = row.get(mapping["credit"])
                if pd.notna(credit_val) and float(credit_val) != 0:
                    is_credit = True

            # Skip credit-only rows (salary, deposits, refunds = income)
            if is_credit and amount is None:
                continue

            if amount is None or amount == 0:
                continue

            desc = ""
            if mapping.get("description") and mapping["description"] in df.columns:
                desc = str(row[mapping["description"]])

            date_str = ""
            if mapping.get("date") and mapping["date"] in df.columns:
                date_str = str(row[mapping["date"]])

            transactions.append({
                "id": str(uuid4()),
                "description": desc.strip() if desc else "Unknown",
                "amount": amount,
                "date": date_str,
            })
        except Exception as e:
            logger.warning("Skipping CSV row due to error: %s", e)
            continue

    logger.info("Parsed %d transactions from CSV", len(transactions))
    return transactions


def parse_pdf(filepath: str) -> list[dict]:
    """
    Parse a PDF bank statement using pdfplumber.
    Extracts text from all pages and attempts table extraction first,
    falls back to raw text for AI parsing.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed")
        return []

    all_text = ""
    table_rows: list[dict] = []

    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                all_text += text + "\n"

                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        table_rows.extend(_parse_table_rows(table))
    except Exception as e:
        logger.error("Failed to parse PDF: %s", e)
        return []

    # If we got structured table rows, use those
    if table_rows:
        logger.info("Extracted %d rows from PDF tables", len(table_rows))
        return table_rows

    # Otherwise return the raw text for AI parsing
    logger.info("No tables found in PDF, returning raw text for AI extraction")
    return [{"raw_text": all_text, "needs_ai_parsing": True}]


def parse_image(filepath: str) -> list[dict]:
    """
    Parse a receipt image using OCR (pytesseract).
    Returns raw text for AI extraction.
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.error("pytesseract or Pillow not installed")
        return [{"raw_text": "OCR libraries not available", "needs_ai_parsing": True}]

    try:
        img = Image.open(filepath)
        text = pytesseract.image_to_string(img)
        logger.info("OCR extracted %d characters from image", len(text))
        return [{"raw_text": text, "needs_ai_parsing": True}]
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return [{"raw_text": f"OCR failed: {str(e)}", "needs_ai_parsing": True}]


def get_csv_headers(filepath: str) -> list[str]:
    """Read just the headers from a CSV/Excel file."""
    try:
        if filepath.endswith((".xlsx", ".xls")):
            df = pd.read_excel(filepath, nrows=0)
        else:
            df = pd.read_csv(filepath, nrows=0)
        return list(df.columns)
    except Exception as e:
        logger.error("Failed to read headers: %s", e)
        return []


def _heuristic_column_mapping(headers: list[str]) -> Optional[dict]:
    """Try to auto-detect column mapping from common header names."""
    headers_lower = [h.lower().strip() for h in headers]

    mapping: dict[str, Optional[str]] = {
        "date": None,
        "description": None,
        "debit": None,
        "credit": None,
    }

    date_keywords = ["date", "transaction date", "txn date", "value date", "posting date"]
    desc_keywords = ["description", "narration", "particulars", "details", "remarks", "memo"]
    debit_keywords = ["debit", "withdrawal", "amount", "debit amount", "debit amt"]
    credit_keywords = ["credit", "deposit", "credit amount", "credit amt"]

    for i, h in enumerate(headers_lower):
        if not mapping["date"] and any(k == h for k in date_keywords):
            mapping["date"] = headers[i]
        if not mapping["description"] and any(k == h for k in desc_keywords):
            mapping["description"] = headers[i]
        if not mapping["debit"] and any(k == h for k in debit_keywords):
            mapping["debit"] = headers[i]
        if not mapping["credit"] and any(k == h for k in credit_keywords):
            mapping["credit"] = headers[i]

    # Must have at least description and debit/amount
    if mapping["description"] and mapping["debit"]:
        return mapping

    return None


def _fallback_parse(df: pd.DataFrame) -> list[dict]:
    """Last-resort: return first few rows as raw text for AI parsing."""
    rows = []
    for _, row in df.head(50).iterrows():
        rows.append({
            "id": str(uuid4()),
            "description": " | ".join(str(v) for v in row.values if pd.notna(v)),
            "amount": 0,
            "date": "",
        })
    return rows


def _parse_table_rows(table: list) -> list[dict]:
    """Parse rows from a pdfplumber table extraction."""
    if not table or len(table) < 2:
        return []

    transactions = []
    # First row is typically headers
    for row in table[1:]:
        if not row or len(row) < 2:
            continue

        # Try to find a numeric value (the amount)
        amount = None
        desc_parts = []
        date_str = ""

        for cell in row:
            if cell is None:
                continue
            cell_str = str(cell).strip()
            if not cell_str:
                continue

            # Try to parse as number
            try:
                clean = cell_str.replace(",", "").replace("$", "").replace("₹", "")
                val = float(clean)
                if amount is None:
                    amount = abs(val)
                continue
            except ValueError:
                pass

            # Check if it looks like a date
            if _looks_like_date(cell_str) and not date_str:
                date_str = cell_str
            else:
                desc_parts.append(cell_str)

        if amount and amount > 0:
            transactions.append({
                "id": str(uuid4()),
                "description": " ".join(desc_parts) or "Unknown",
                "amount": amount,
                "date": date_str,
            })

    return transactions


def _looks_like_date(text: str) -> bool:
    """Simple heuristic to check if text looks like a date."""
    import re
    patterns = [
        r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
        r"\d{4}[/-]\d{1,2}[/-]\d{1,2}",
        r"\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)",
    ]
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            return True
    return False
