from fastapi import APIRouter, HTTPException
import logging
from schemas.auth_schema import SignupRequest, LoginRequest, ForgotPasswordRequest
from services.auth_service import AuthService
from db.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/auth", tags=["auth"])

@router.post("/signup")
async def signup(request: SignupRequest):
    return AuthService.signup(request)

@router.post("/login")
async def login(request: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        user = res.user
        session = res.session

        if not user or not session:
            raise Exception("Authentication failed")

        profile = (
            supabase.table("user_profiles")
            .select("onboarding_complete")
            .eq("id", user.id)
            .single()
            .execute()
        )

        onboarding_complete = bool(profile.data.get("onboarding_complete", False))

        if not onboarding_complete:
            response = {
                "status": "ONBOARDING_REQUIRED",
                "access_token": session.access_token,
                "user_id": user.id,
            }
            logger.info("Login response for user_id=%s status=ONBOARDING_REQUIRED", user.id)
            return response

        response = {
            "status": "LOGIN_SUCCESS",
            "access_token": session.access_token,
            "user_id": user.id,
        }
        logger.info("Login response for user_id=%s status=LOGIN_SUCCESS", user.id)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"code": "LOGIN_FAILED", "message": "Invalid email or password", "detail": str(e)},
        )

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    return AuthService.forgot_password(request)
