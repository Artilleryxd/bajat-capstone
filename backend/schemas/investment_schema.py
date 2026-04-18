# backend/schemas/investment_schema.py
from pydantic import BaseModel, Field
from typing import Optional


class ProfileOverrides(BaseModel):
    """Temporary profile assumptions — never persisted to DB."""
    monthly_income: Optional[float] = None
    investment_exp: Optional[str] = None   # beginner / intermediate / advanced
    time_horizon: Optional[str] = None     # short / medium / long / retirement


class InvestmentGoal(BaseModel):
    goal_amount: float = Field(gt=0)
    current_portfolio_value: float = Field(ge=0)
    sip_date: int = Field(ge=1, le=28, description="Day of month for SIP")
    portfolio_text: Optional[str] = None   # free-text description of current holdings


class GenerateStrategyRequest(BaseModel):
    goal: Optional[InvestmentGoal] = None
    overrides: Optional[ProfileOverrides] = None


class AllocationItem(BaseModel):
    name: str
    percentage: float
    color: str
    rationale: str


class GoalProjection(BaseModel):
    years_to_goal: Optional[float] = None
    projected_value_5yr: float
    projected_value_10yr: float
    projected_value_20yr: float
    monthly_sip: float
    expected_return_pct: float


class InvestmentStrategyResponse(BaseModel):
    id: Optional[str] = None
    risk_score: int
    risk_profile: str                       # conservative / moderate / aggressive
    risk_explanation: str
    is_debt_heavy: bool
    debt_warning: Optional[str] = None
    allocations: list[AllocationItem]
    investable_surplus: float
    ai_insights: str
    goal_projection: Optional[GoalProjection] = None
    goal_amount: Optional[float] = None
    current_portfolio_value: Optional[float] = None
    sip_date: Optional[int] = None
    estimated_annual_return: Optional[float] = None
    time_horizon: Optional[str] = None
    is_using_overrides: bool = False
    created_at: Optional[str] = None
