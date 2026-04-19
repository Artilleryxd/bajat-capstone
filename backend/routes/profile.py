from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from schemas.profile_schema import OnboardingRequest, ProfileResponse
from services.profile_service import ProfileService
from services.ai_service import generate_health_score
from utils.jwt_verifier import get_current_user
from db.supabase_client import supabase

router = APIRouter(prefix="/v1/profile", tags=["profile"])


@router.post("/onboard")
async def onboard_user(request: OnboardingRequest, user: dict = Depends(get_current_user)):
    return ProfileService.onboard_user(user["id"], request)


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user: dict = Depends(get_current_user)):
    return ProfileService.get_profile(user["id"])


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    neighbourhood: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    marital_status: Optional[str] = None
    monthly_income: Optional[float] = None
    income_type: Optional[str] = None
    num_dependents: Optional[int] = None
    housing_status: Optional[str] = None


@router.patch("/me")
async def update_profile(body: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail={"code": "NO_FIELDS", "message": "No fields to update"})
    try:
        res = supabase.table("user_profiles").update(update_data).eq("id", user["id"]).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Profile not found"})
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "UPDATE_FAILED", "message": str(e)})


class HealthScoreRequest(BaseModel):
    monthly_income: float
    monthly_expenses: Optional[float] = None
    net_worth: Optional[float] = None
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    debt_ratio: Optional[float] = None
    loan_count: int = 0
    total_emi: float = 0.0
    has_investment_strategy: bool = False
    is_debt_heavy: bool = False
    currency: str = "INR"


@router.post("/health-score")
async def get_health_score(
    body: HealthScoreRequest,
    user: dict = Depends(get_current_user),
):
    result = generate_health_score(
        monthly_income=body.monthly_income,
        monthly_expenses=body.monthly_expenses,
        net_worth=body.net_worth,
        total_assets=body.total_assets,
        total_liabilities=body.total_liabilities,
        debt_ratio=body.debt_ratio,
        loan_count=body.loan_count,
        total_emi=body.total_emi,
        has_investment_strategy=body.has_investment_strategy,
        is_debt_heavy=body.is_debt_heavy,
        currency=body.currency,
    )
    if result is None:
        raise HTTPException(status_code=503, detail="Health score generation failed")
    return result
