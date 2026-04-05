"""Expense routes — manual entry, file upload, confirm, and monthly fetch."""

import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException

from schemas.expense_schema import (
    ManualExpenseCreate,
    ConfirmExpensesRequest,
)
from services.expense_service import (
    create_manual_expense,
    process_upload,
    confirm_expenses,
    get_monthly_expenses,
)
from utils.jwt_verifier import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/expenses", tags=["expenses"])

ALLOWED_TYPES = {
    "text/csv": "csv",
    "application/vnd.ms-excel": "excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/manual")
async def add_manual_expense(
    body: ManualExpenseCreate,
    user: dict = Depends(get_current_user),
):
    """Add a single expense manually."""
    try:
        result = await create_manual_expense(
            user_id=user["id"],
            data=body.model_dump(),
        )
        return {"status": "success", "expense": result}
    except Exception as e:
        logger.error("Manual expense creation failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "EXPENSE_CREATION_FAILED", "message": str(e)},
        )


@router.post("/upload")
async def upload_expense_file(
    file: UploadFile = File(...),
    file_type: str = Form(default=""),
    user: dict = Depends(get_current_user),
):
    """
    Upload a file (CSV, Excel, PDF, or image) for AI parsing.
    Returns parsed expenses for preview — user must confirm before saving.
    """
    # Validate file type
    content_type = file.content_type or ""
    detected_type = file_type or ALLOWED_TYPES.get(content_type)

    if not detected_type:
        # Try to detect from filename
        filename = (file.filename or "").lower()
        if filename.endswith(".csv"):
            detected_type = "csv"
        elif filename.endswith((".xlsx", ".xls")):
            detected_type = "excel"
        elif filename.endswith(".pdf"):
            detected_type = "pdf"
        elif filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            detected_type = "image"
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "UNSUPPORTED_FILE",
                    "message": f"Unsupported file type: {content_type}. Supported: CSV, Excel, PDF, JPG, PNG",
                },
            )

    # Validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail={"code": "FILE_TOO_LARGE", "message": "File must be under 10MB"},
        )
    # Reset file position for re-reading
    await file.seek(0)

    try:
        expenses = await process_upload(
            user_id=user["id"],
            file=file,
            file_type=detected_type,
        )
        return {
            "status": "success",
            "message": f"Parsed {len(expenses)} transactions from {detected_type} file",
            "expenses": expenses,
        }
    except Exception as e:
        logger.error("File upload processing failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "UPLOAD_FAILED", "message": str(e)},
        )


@router.post("/confirm")
async def confirm_parsed_expenses(
    body: ConfirmExpensesRequest,
    user: dict = Depends(get_current_user),
):
    """Bulk-save confirmed expenses to the database."""
    try:
        expense_dicts = [e.model_dump() for e in body.expenses]
        count = await confirm_expenses(user["id"], expense_dicts)
        return {"status": "success", "inserted": count}
    except Exception as e:
        logger.error("Expense confirmation failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "CONFIRM_FAILED", "message": str(e)},
        )


@router.get("/{month_year}")
async def get_expenses_by_month(
    month_year: str,
    user: dict = Depends(get_current_user),
):
    """
    Get all expenses for a month. month_year format: YYYY-MM-DD (1st of month).
    Example: 2026-04-01
    """
    try:
        result = await get_monthly_expenses(user["id"], month_year)
        return result
    except Exception as e:
        logger.error("Fetch expenses failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "FETCH_FAILED", "message": str(e)},
        )
