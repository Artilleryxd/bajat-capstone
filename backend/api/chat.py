"""Chat API for budget-aware financial assistant conversations."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from db.supabase_client import supabase_admin
from utils.jwt_verifier import get_current_user

logger = logging.getLogger(__name__)

SONNET_MODEL = "claude-sonnet-4-20250514"

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str | None = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _anthropic_client() -> anthropic.Anthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
    return anthropic.Anthropic(api_key=api_key)


def _first_row(data: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    if data and len(data) > 0:
        return data[0]
    return None


async def _fetch_latest_budget(user_id: str) -> dict[str, Any] | None:
    try:
        res = (
            supabase_admin.table("budgets")
            .select("id,generated_budget,created_at")
            .eq("user_id", user_id)
            .eq("is_temporary", False)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return _first_row(res.data)
    except Exception as exc:
        logger.warning("Failed to fetch latest budget for chat context: %s", exc)
        return None


async def _fetch_profile(user_id: str) -> dict[str, Any]:
    try:
        res = supabase_admin.table("user_profiles").select("*").eq("id", user_id).limit(1).execute()
        return _first_row(res.data) or {}
    except Exception as exc:
        logger.warning("Failed to fetch profile for chat context: %s", exc)
        return {}


def _normalize_for_claude(history: list[dict[str, Any]], current_user_text: str) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    for item in history:
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": current_user_text})
    return messages


async def _call_claude(system_prompt: str, messages: list[dict[str, str]]) -> str:
    client = _anthropic_client()

    def _invoke() -> anthropic.types.Message:
        return client.messages.create(
            model=SONNET_MODEL,
            max_tokens=1000,
            system=system_prompt,
            messages=messages,
        )

    response = await asyncio.to_thread(_invoke)
    text_parts = [getattr(part, "text", "") for part in response.content]
    return "\n".join(p for p in text_parts if p).strip()


async def _get_chat_session(user_id: str, session_id: str) -> dict[str, Any] | None:
    try:
        res = (
            supabase_admin.table("chat_sessions")
            .select("id,user_id,messages,context_budget_id,created_at")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        return _first_row(res.data)
    except Exception as exc:
        logger.error("Failed to fetch chat session: %s", exc)
        return None


@router.post("/message")
async def post_chat_message(payload: ChatMessageRequest, user: dict = Depends(get_current_user)):
    """
    Send a message to Claude with user profile + latest budget context.
    Persists both user and assistant messages in chat_sessions.
    """
    try:
        user_id = user["id"]
        latest_budget = await _fetch_latest_budget(user_id)
        profile = await _fetch_profile(user_id)

        existing_session: dict[str, Any] | None = None
        prior_messages: list[dict[str, Any]] = []

        if payload.session_id:
            existing_session = await _get_chat_session(user_id=user_id, session_id=payload.session_id)
            if not existing_session:
                raise HTTPException(
                    status_code=404,
                    detail={"code": "SESSION_NOT_FOUND", "message": "Chat session not found."},
                )
            prior_messages = existing_session.get("messages") or []

        system_prompt = (
            "You are a financial advisor. "
            f"The user's current budget is: {json.dumps((latest_budget or {}).get('generated_budget', {}), default=str)}. "
            f"The user's financial profile is: {json.dumps(profile, default=str)}. "
            "Give practical, concise, non-legal, non-tax-advice financial guidance."
        )

        claude_messages = _normalize_for_claude(prior_messages, payload.message)

        try:
            assistant_reply = await _call_claude(system_prompt=system_prompt, messages=claude_messages)
            if not assistant_reply:
                raise ValueError("Empty Claude response")
        except Exception as exc:
            logger.error("Claude chat failed, using graceful fallback: %s", exc)
            assistant_reply = (
                "I could not generate a full response right now. "
                "Please try again in a moment, and meanwhile prioritize essentials, emergency savings, and high-interest debt payments."
            )

        user_entry = {
            "role": "user",
            "content": payload.message,
            "timestamp": _utc_now_iso(),
        }
        assistant_entry = {
            "role": "assistant",
            "content": assistant_reply,
            "timestamp": _utc_now_iso(),
        }

        if existing_session:
            updated_messages = [*prior_messages, user_entry, assistant_entry]
            try:
                update_payload = {"messages": updated_messages}
                if not existing_session.get("context_budget_id") and latest_budget:
                    update_payload["context_budget_id"] = latest_budget["id"]

                supabase_admin.table("chat_sessions").update(update_payload).eq(
                    "id", existing_session["id"]
                ).eq("user_id", user_id).execute()
            except Exception as exc:
                logger.error("Failed to update chat session: %s", exc)
                raise HTTPException(
                    status_code=500,
                    detail={"code": "CHAT_SAVE_FAILED", "message": "Failed to save chat message history."},
                )

            return {
                "session_id": existing_session["id"],
                "reply": assistant_reply,
            }

        try:
            row = {
                "user_id": user_id,
                "messages": [user_entry, assistant_entry],
                "context_budget_id": (latest_budget or {}).get("id"),
            }
            insert_res = supabase_admin.table("chat_sessions").insert(row).execute()
            inserted = _first_row(insert_res.data)
            if not inserted:
                raise RuntimeError("Chat session insert returned no row")
        except Exception as exc:
            logger.error("Failed to create chat session: %s", exc)
            raise HTTPException(
                status_code=500,
                detail={"code": "CHAT_SAVE_FAILED", "message": "Failed to save chat session."},
            )

        return {
            "session_id": inserted["id"],
            "reply": assistant_reply,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Chat message endpoint failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "CHAT_MESSAGE_FAILED", "message": "Failed to process chat message."},
        )


@router.get("/history")
async def get_chat_history(
    session_id: str = Query(..., min_length=1),
    user: dict = Depends(get_current_user),
):
    """Return full message history for the specified user-owned chat session."""
    try:
        session = await _get_chat_session(user_id=user["id"], session_id=session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail={"code": "SESSION_NOT_FOUND", "message": "Chat session not found."},
            )

        return {
            "session_id": session["id"],
            "messages": session.get("messages") or [],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Chat history endpoint failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "CHAT_HISTORY_FAILED", "message": "Failed to fetch chat history."},
        )