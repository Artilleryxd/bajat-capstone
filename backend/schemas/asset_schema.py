"""Pydantic schemas for the asset & net worth module."""

from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


# ── Categorization ──

class FinancialClassifyRequest(BaseModel):
    """Input for AI financial item classification."""
    name: str = Field(..., min_length=1, max_length=300, description="Item name e.g. 'Honda City 2020'")
    description: Optional[str] = Field(None, max_length=500)


class FinancialClassifyResponse(BaseModel):
    """AI classification result."""
    type: str  # "asset" or "liability"
    asset_type: Optional[str] = None  # real_estate, vehicle, gold, equity, fd, gadget, other
    liability_type: Optional[str] = None  # loan, credit_card, other
    confidence: float


# ── Assets ──

class AssetAddRequest(BaseModel):
    """Request body for adding a new asset."""
    name: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=500)
    purchase_price: float = Field(..., gt=0)
    purchase_date: date = Field(default_factory=date.today)
    current_value: Optional[float] = Field(None, ge=0)
    metadata: Optional[dict] = None


class AssetResponse(BaseModel):
    """A single asset record from the database."""
    id: str
    user_id: str
    asset_type: str
    name: str
    purchase_price: Optional[float] = None
    purchase_date: Optional[str] = None
    current_value: Optional[float] = None
    value_source: Optional[str] = None
    appreciation_rate: Optional[float] = None
    last_valued_at: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ── Liabilities ──

class LiabilityAddRequest(BaseModel):
    """Request body for adding a loan / liability."""
    loan_type: str = Field(..., description="home_loan, car_loan, personal_loan, education_loan, credit_card, bnpl")
    lender: Optional[str] = None
    principal_outstanding: float = Field(..., gt=0)
    interest_rate: float = Field(..., ge=0, le=100)
    emi_amount: float = Field(..., gt=0)
    emis_remaining: int = Field(..., gt=0)
    tenure_months: Optional[int] = None
    down_payment: Optional[float] = 0


class LoanResponse(BaseModel):
    """A single loan record from the database."""
    id: str
    user_id: str
    loan_type: str
    lender: Optional[str] = None
    principal_outstanding: float
    interest_rate: float
    emi_amount: float
    emis_remaining: int
    tenure_months: Optional[int] = None
    down_payment: Optional[float] = 0
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ── Net Worth ──

class NetWorthSummary(BaseModel):
    """Exact + approximate net worth response."""
    total_assets: float
    total_liabilities: float
    net_worth: float
    approx_net_worth: Optional[float] = None
    approx_confidence: Optional[float] = None
    approx_range: Optional[dict] = None  # { "min": ..., "max": ... }
    approx_reasoning: Optional[str] = None
    debt_ratio: float  # percentage
    asset_count: int
    liability_count: int


# ── Projections ──

class AssetProjectionResponse(BaseModel):
    """Future value projection for a single asset."""
    asset_id: str
    name: str
    asset_type: str
    current_value: float
    appreciation_rate: float
    projections: dict  # { "1": ..., "3": ..., "5": ..., "10": ... }


# ── Timeline ──

class NetWorthTimelineEntry(BaseModel):
    """A single point in the net worth timeline."""
    year: int
    total_assets: float
    total_liabilities: float
    net_worth: float


class NetWorthTimelineResponse(BaseModel):
    """Projected net worth over time."""
    current: NetWorthSummary
    timeline: list[NetWorthTimelineEntry]
