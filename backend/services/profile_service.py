from fastapi import HTTPException
import logging
from db.supabase_client import supabase, supabase_admin
from schemas.profile_schema import OnboardingRequest

logger = logging.getLogger(__name__)


class ProfileService:
    @staticmethod
    def onboard_user(user_id: str, request: OnboardingRequest):
        try:
            normalized_gender = request.gender.strip().lower() if request.gender else None

            update_data = {
                "full_name": request.full_name,
                "gender": normalized_gender,
                "date_of_birth": request.date_of_birth,
                "country": request.country,
                "city": request.city,
                "neighbourhood": request.neighbourhood,
                "currency": request.currency,
                "marital_status": request.marital_status,
                "num_dependents": request.num_dependents,
                "housing_status": request.housing_status,
                "monthly_income": request.monthly_income,
                "income_type": request.income_type,
                "has_existing_loans": request.has_existing_loans,
                "onboarding_complete": True,
            }

            try:
                res = supabase.table("user_profiles").update(update_data).eq("id", user_id).execute()
            except Exception as update_error:
                # Backward compatibility: if the DB migration adding `gender` wasn't applied yet,
                # retry once without gender so onboarding can still complete.
                error_text = str(update_error).lower()
                if "gender" in error_text and ("column" in error_text or "schema cache" in error_text):
                    update_data.pop("gender", None)
                    res = supabase.table("user_profiles").update(update_data).eq("id", user_id).execute()
                    logger.warning("Onboarding saved without gender for user_id=%s because gender column is missing", user_id)
                else:
                    raise

            if not res.data:
                raise Exception("Profile record not found to update")

            logger.info("Onboarding update success for user_id=%s", user_id)
            return {"message": "Onboarding completed successfully", "profile": res.data[0]}

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail={"code": "ONBOARDING_FAILED", "message": "Failed to save onboarding data", "detail": str(e)},
            )

    @staticmethod
    def get_profile(user_id: str):
        try:
            res = supabase_admin.table("user_profiles").select("*").eq("id", user_id).execute()

            if not res.data or len(res.data) == 0:
                raise HTTPException(
                    status_code=404,
                    detail={"code": "PROFILE_NOT_FOUND", "message": "User profile does not exist"},
                )

            return res.data[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail={"code": "FETCH_FAILED", "message": "Failed to fetch user profile", "detail": str(e)},
            )
