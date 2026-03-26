from fastapi import APIRouter, Depends
from schemas.profile_schema import OnboardingRequest, ProfileResponse
from services.profile_service import ProfileService
from utils.jwt_verifier import get_current_user

router = APIRouter(prefix="/v1/profile", tags=["profile"])

@router.post("/onboard")
async def onboard_user(request: OnboardingRequest, user: dict = Depends(get_current_user)):
    return ProfileService.onboard_user(user["id"], request)

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user: dict = Depends(get_current_user)):
    return ProfileService.get_profile(user["id"])
