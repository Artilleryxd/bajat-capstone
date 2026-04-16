# backend/schemas/loan_schema.py
from pydantic import BaseModel, Field
from typing import Optional, Literal


class LoanCreate(BaseModel):
    loan_type: str
    lender: Optional[str] = None
    principal_outstanding: float = Field(gt=0)
    interest_rate: float = Field(gt=0, le=100)
    emi_amount: float = Field(gt=0)
    emis_remaining: int = Field(gt=0)
    tenure_months: Optional[int] = None


class LoanResponse(BaseModel):
    id: str
    loan_type: str
    lender: Optional[str] = None
    principal_outstanding: float
    interest_rate: float
    emi_amount: float
    emis_remaining: int
    tenure_months: Optional[int] = None
    is_active: bool


class ScheduleEntry(BaseModel):
    month: int
    loan_id: str
    payment: float
    interest: float
    principal: float
    remaining_balance: float


class TimelineEntry(BaseModel):
    year: int
    total_balance: float
    label: str


class StrategyResult(BaseModel):
    strategy_type: str
    total_interest_paid: float
    months_to_close: int
    total_payment: float
    schedule: list[ScheduleEntry]
    timeline: list[TimelineEntry]


class OptimizeResponse(BaseModel):
    best_strategy: Literal["avalanche", "snowball"]
    comparison: dict[str, StrategyResult]
    total_saved: float
    months_saved: int
    interest_diff: float
    months_diff: int
    monthly_surplus: float
    optimization_basis: dict
    strategy_scores: dict[str, float]
    ai_explanation: str
