"""Asset & Net Worth routes — categorize, CRUD, projections, net worth intelligence."""

import logging
from fastapi import APIRouter, Depends, HTTPException

from schemas.asset_schema import (
    FinancialClassifyRequest,
    AssetAddRequest,
    LiabilityAddRequest,
)
from services.ai_categorizer import classify_financial_item
from services.asset_service import (
    add_asset,
    get_all_assets,
    get_asset_by_id,
    refresh_asset_value,
    add_liability,
    get_all_liabilities,
    project_asset_value,
    ai_project_asset,
)
from services.networth_service import (
    get_net_worth_summary,
    get_net_worth_timeline,
)
from utils.jwt_verifier import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["assets", "networth"])


# ── 1. Financial Classification ──

@router.post("/v1/financial/categorize")
async def categorize_financial_item_route(
    body: FinancialClassifyRequest,
    user: dict = Depends(get_current_user),
):
    """Classify a financial item as asset or liability using AI."""
    try:
        text = f"{body.name} {body.description or ''}".strip()
        result = classify_financial_item(text)
        return {"status": "success", "classification": result}
    except Exception as e:
        logger.error("Classification failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "CLASSIFICATION_FAILED", "message": str(e)},
        )


# ── 2. Asset CRUD ──

@router.post("/v1/assets/add")
async def add_asset_route(
    body: AssetAddRequest,
    user: dict = Depends(get_current_user),
):
    """Add a new material possession (asset). AI categorizes and values it."""
    try:
        result = await add_asset(
            user_id=user["id"],
            data=body.model_dump(),
        )
        return {"status": "success", "asset": result}
    except Exception as e:
        logger.error("Asset creation failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "ASSET_CREATION_FAILED", "message": str(e)},
        )


@router.get("/v1/assets/all")
async def get_all_assets_route(
    user: dict = Depends(get_current_user),
):
    """Get all assets for the authenticated user."""
    try:
        assets = await get_all_assets(user["id"])
        total = sum(
            float(a.get("current_value", 0) or a.get("purchase_price", 0) or 0)
            for a in assets
        )
        return {
            "status": "success",
            "assets": assets,
            "total_value": round(total, 2),
            "count": len(assets),
        }
    except Exception as e:
        logger.error("Fetch assets failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "FETCH_FAILED", "message": str(e)},
        )


@router.post("/v1/assets/value/fetch")
async def refresh_asset_value_route(
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Trigger valuation refresh for a specific asset."""
    asset_id = body.get("asset_id")
    if not asset_id:
        raise HTTPException(status_code=400, detail={"code": "MISSING_ASSET_ID", "message": "asset_id is required"})

    try:
        result = await refresh_asset_value(asset_id, user["id"])
        if not result:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Asset not found"})
        return {"status": "success", "asset": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Value refresh failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "REFRESH_FAILED", "message": str(e)},
        )


# ── 3. Liability CRUD ──

@router.post("/v1/liabilities/add")
async def add_liability_route(
    body: LiabilityAddRequest,
    user: dict = Depends(get_current_user),
):
    """Add a new loan/liability."""
    try:
        result = await add_liability(
            user_id=user["id"],
            data=body.model_dump(),
        )
        return {"status": "success", "liability": result}
    except Exception as e:
        logger.error("Liability creation failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "LIABILITY_CREATION_FAILED", "message": str(e)},
        )


@router.get("/v1/liabilities/all")
async def get_all_liabilities_route(
    user: dict = Depends(get_current_user),
):
    """Get all active liabilities for the authenticated user."""
    try:
        liabilities = await get_all_liabilities(user["id"])
        total = sum(float(l.get("principal_outstanding", 0)) for l in liabilities)
        return {
            "status": "success",
            "liabilities": liabilities,
            "total_outstanding": round(total, 2),
            "count": len(liabilities),
        }
    except Exception as e:
        logger.error("Fetch liabilities failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "FETCH_FAILED", "message": str(e)},
        )


# ── 4. Net Worth Intelligence ──

@router.get("/v1/networth/summary")
async def net_worth_summary_route(
    user: dict = Depends(get_current_user),
):
    """
    Get full net worth summary: exact + approximate (AI-estimated).
    """
    try:
        result = await get_net_worth_summary(user["id"])
        return {"status": "success", **result}
    except Exception as e:
        logger.error("Net worth summary failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "NETWORTH_FAILED", "message": str(e)},
        )


@router.get("/v1/networth/timeline")
async def net_worth_timeline_route(
    user: dict = Depends(get_current_user),
):
    """Get net worth projection timeline (0–10 years)."""
    try:
        result = await get_net_worth_timeline(user["id"])
        return {"status": "success", **result}
    except Exception as e:
        logger.error("Net worth timeline failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail={"code": "TIMELINE_FAILED", "message": str(e)},
        )


# ── 5. Asset Drill-down ──

@router.get("/v1/assets/{asset_id}/drilldown")
async def asset_drilldown_route(
    asset_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Drill-down view for a single asset:
    - Current value, purchase value, appreciation %
    - Future projections at 1, 3, 5, 10 years
    """
    try:
        asset = await get_asset_by_id(asset_id, user["id"])
        if not asset:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Asset not found"})

        purchase_price = float(asset.get("purchase_price", 0) or 0)

        # AI-powered valuation + 5-year projection via Claude Sonnet
        ai_proj = await ai_project_asset(asset)
        current_value = ai_proj["current_value"]

        # Appreciation vs purchase price
        if purchase_price > 0:
            appreciation_pct = round(((current_value - purchase_price) / purchase_price) * 100, 2)
        else:
            appreciation_pct = 0

        return {
            "status": "success",
            "asset": asset,
            "current_value": current_value,
            "purchase_price": purchase_price,
            "appreciation_pct": appreciation_pct,
            "appreciation_rate": ai_proj.get("annual_rate", float(asset.get("appreciation_rate", 0) or 0)),
            "projections": ai_proj["projections"],
            "ai_projection": ai_proj,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Drilldown failed for asset %s: %s", asset_id, e)
        raise HTTPException(
            status_code=500,
            detail={"code": "DRILLDOWN_FAILED", "message": str(e)},
        )
