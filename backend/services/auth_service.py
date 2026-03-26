from fastapi import HTTPException
import logging
from db.supabase_client import supabase, supabase_admin
from schemas.auth_schema import SignupRequest, LoginRequest, ForgotPasswordRequest

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def signup(request: SignupRequest):
        try:
            res = supabase.auth.sign_up({
                "email": request.email,
                "password": request.password
            })
            
            user = res.user
            if user:
                logger.info("Signup success for user_id=%s", user.id)

                supabase_admin.table("user_profiles").upsert(
                    {
                        "id": user.id,
                        "onboarding_complete": False,
                    },
                    on_conflict="id",
                ).execute()
                logger.info("Profile created for user_id=%s with onboarding_complete=False", user.id)
                
                return {
                    "message": "User created successfully",
                    "user": {
                        "id": user.id,
                        "email": user.email
                    }
                }
            else:
                 raise Exception("Sign up returned no user data")
                 
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={"code": "SIGNUP_FAILED", "message": "Failed to create user", "detail": str(e)}
            )

    @staticmethod
    def login(request: LoginRequest):
        try:
            res = supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password
            })
            
            user = res.user
            session = res.session
            
            if not user or not session:
                raise Exception("Authentication failed")

            profile_res = (
                supabase
                .table("user_profiles")
                .select("onboarding_complete")
                .eq("id", user.id)
                .single()
                .execute()
            )

            onboarding_complete = bool(profile_res.data.get("onboarding_complete", False))
            
            status = "LOGIN_SUCCESS" if onboarding_complete else "ONBOARDING_REQUIRED"
            logger.info("Login response for user_id=%s status=%s", user.id, status)

            return {
                "status": status,
                "access_token": session.access_token,
                "user_id": user.id
            }
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail={"code": "LOGIN_FAILED", "message": "Invalid email or password", "detail": str(e)}
            )

    @staticmethod
    def forgot_password(request: ForgotPasswordRequest):
        try:
            supabase.auth.reset_password_email(request.email)
            return {"message": "Password reset email sent (if email exists in the system)"}
        except Exception as e:
             raise HTTPException(
                status_code=400,
                detail={"code": "RESET_FAILED", "message": "Failed to initiate password reset", "detail": str(e)}
            )
