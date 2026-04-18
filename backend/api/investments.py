# backend/api/investments.py
"""Investment strategy endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from schemas.investment_schema import GenerateStrategyRequest, InvestmentStrategyResponse
from services.investment_service import generate_strategy, get_latest_strategy, _row_to_response
from services.ai_service import parse_portfolio_from_text
from utils.jwt_verifier import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/investment", tags=["investment"])


@router.get("/latest", response_model=InvestmentStrategyResponse)
def get_latest(user: dict = Depends(get_current_user)):
    """Return the most recent active investment strategy for the user."""
    row = get_latest_strategy(user["id"])
    if not row:
        raise HTTPException(
            status_code=404,
            detail={"code": "NO_STRATEGY", "message": "No investment strategy found. Generate one first."},
        )
    return _row_to_response(row)


@router.post("/strategy", response_model=InvestmentStrategyResponse)
def create_strategy(
    body: GenerateStrategyRequest,
    user: dict = Depends(get_current_user),
):
    """
    Generate a new investment strategy.
    - If body.overrides is set, strategy is NOT saved to DB (temporary simulation).
    - Otherwise, saves as the active strategy.
    """
    try:
        save = body.overrides is None  # only persist when no overrides
        return generate_strategy(user["id"], body, save_to_db=save)
    except Exception as e:
        logger.error("Investment strategy generation failed for %s: %s", user["id"], e)
        raise HTTPException(
            status_code=500,
            detail={"code": "GENERATE_FAILED", "message": "Failed to generate strategy. Please try again."},
        )


@router.post("/parse-portfolio")
async def parse_portfolio(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Accept a PDF, CSV, XLSX, or image file.
    Extract text / describe holdings, return a portfolio_text string
    and an AI-estimated annual return %.
    """
    import tempfile, os, base64

    filename = (file.filename or "").lower()
    content = await file.read()

    try:
        portfolio_text: str = ""

        # ── PDF ──────────────────────────────────────────────────────────────
        if filename.endswith(".pdf"):
            import pdfplumber, io
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                pages_text = []
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        pages_text.append(t)
                portfolio_text = "\n".join(pages_text)[:3000]

        # ── CSV / XLSX ────────────────────────────────────────────────────────
        elif filename.endswith((".csv", ".xlsx", ".xls")):
            import pandas as pd, io
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_excel(io.BytesIO(content))
            portfolio_text = df.to_string(index=False)[:3000]

        # ── Image (Claude vision) ─────────────────────────────────────────────
        elif filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            import anthropic, os as _os
            b64 = base64.standard_b64encode(content).decode("utf-8")
            media_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
            ext = filename.rsplit(".", 1)[-1]
            media_type = media_map.get(ext, "image/jpeg")

            client = anthropic.Anthropic(api_key=_os.environ.get("ANTHROPIC_API_KEY"))
            resp = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": media_type, "data": b64},
                        },
                        {
                            "type": "text",
                            "text": "This is a portfolio statement or holdings document. Extract the investment holdings — asset names, amounts, and percentages if visible. Return a concise plain-text summary of what you see.",
                        },
                    ],
                }],
            )
            portfolio_text = resp.content[0].text.strip()

        else:
            raise HTTPException(
                status_code=400,
                detail={"code": "UNSUPPORTED_FORMAT", "message": "Supported formats: PDF, CSV, XLSX, JPG, PNG."},
            )

        # Estimate return from the extracted text
        estimated_return = None
        if portfolio_text:
            from db.supabase_client import supabase_admin
            profile_res = (
                supabase_admin.table("user_profiles")
                .select("currency")
                .eq("id", user["id"])
                .execute()
            )
            currency = profile_res.data[0].get("currency", "INR") if profile_res.data else "INR"
            estimated_return = parse_portfolio_from_text(portfolio_text, currency)

        return JSONResponse({
            "portfolio_text": portfolio_text,
            "estimated_return_pct": estimated_return,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Portfolio parse failed for %s: %s", user["id"], e)
        raise HTTPException(
            status_code=500,
            detail={"code": "PARSE_FAILED", "message": "Failed to parse portfolio file."},
        )
