from pydantic import BaseModel
from typing import Optional
from datetime import date

class OnboardingRequest(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    country: str
    city: str
    currency: str
    marital_status: str
    num_dependents: int
    housing_status: str
    monthly_income: float
    income_type: Optional[str] = None
    has_existing_loans: bool

class ProfileResponse(BaseModel):
    id: str
    full_name: Optional[str]
    date_of_birth: Optional[str]
    country: Optional[str]
    city: Optional[str]
    monthly_income: Optional[float]
    income_type: Optional[str]
    currency: Optional[str]
    marital_status: Optional[str]
    num_dependents: Optional[int]
    housing_status: Optional[str]
    has_existing_loans: Optional[bool]
    onboarding_complete: bool
