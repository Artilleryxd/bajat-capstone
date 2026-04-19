from fastapi import APIRouter, HTTPException, Depends
import logging
from pydantic import BaseModel
from schemas.auth_schema import SignupRequest, LoginRequest, ForgotPasswordRequest
from services.auth_service import AuthService
from db.supabase_client import supabase, supabase_admin
from utils.jwt_verifier import get_current_user

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
            supabase_admin.table("user_profiles")
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
                "refresh_token": session.refresh_token,
                "user_id": user.id,
            }
            logger.info("Login response for user_id=%s status=ONBOARDING_REQUIRED", user.id)
            return response

        response = {
            "status": "LOGIN_SUCCESS",
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
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


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    # Verify current password by attempting sign-in
    try:
        supabase.auth.sign_in_with_password({
            "email": user["email"],
            "password": body.current_password,
        })
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"code": "WRONG_PASSWORD", "message": "Current password is incorrect"},
        )
    # Update to new password via admin client
    try:
        supabase_admin.auth.admin.update_user_by_id(user["id"], {"password": body.new_password})
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "UPDATE_FAILED", "message": str(e)},
        )


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    try:
        res = supabase.auth.refresh_session(body.refresh_token)
        session = res.session
        if not session:
            raise Exception("Refresh failed")
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"code": "REFRESH_FAILED", "message": "Session refresh failed", "detail": str(e)},
        )
