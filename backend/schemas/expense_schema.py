"""Pydantic schemas for the expense module."""

from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class ManualExpenseCreate(BaseModel):
    """Schema for creating a single manual expense."""
    amount: float = Field(..., gt=0, description="Expense amount")
    description: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., pattern=r"^(needs|wants|investments|repayments)$")
    expense_date: date = Field(default_factory=date.today)


class ParsedExpense(BaseModel):
    """A single expense parsed from a file or AI categorization."""
    id: str
    description: str
    amount: float
    date: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    confidence: Optional[float] = None
    merchant: Optional[str] = None
    source: str = "manual"
    user_override: bool = False


class ConfirmExpensesRequest(BaseModel):
    """Request body for bulk-confirming parsed expenses."""
    expenses: list[ParsedExpense]


class ExpenseResponse(BaseModel):
    """A single expense record returned from the database."""
    id: str
    user_id: str
    description: str
    amount: float
    category: Optional[str] = None
    subcategory: Optional[str] = None
    merchant: Optional[str] = None
    source: str
    ai_confidence: Optional[float] = None
    user_override: bool = False
    expense_date: Optional[str] = None
    month_year: str
    created_at: Optional[str] = None


class ExpenseUploadResponse(BaseModel):
    """Response after parsing an uploaded file."""
    status: str
    message: str
    expenses: list[ParsedExpense]


class MonthlyExpensesResponse(BaseModel):
    """Response for GET /expenses/{month_year}."""
    month_year: str
    expenses: list[ExpenseResponse]
    summary: dict
