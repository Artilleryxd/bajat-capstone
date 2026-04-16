"""Pydantic database row and payload schemas for budget and chat modules."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class BudgetBase(BaseModel):
    """Common budget fields shared across create/read models."""

    version: int = Field(default=1, ge=1)
    generated_budget: dict[str, Any]
    is_temporary: bool = False


class BudgetCreate(BudgetBase):
    """Payload used when creating a new budget record."""


class Budget(BudgetBase):
    """Budget row as stored in Supabase."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime


class ChatMessage(BaseModel):
    """Single chat message item stored in `chat_sessions.messages`."""

    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1)
    timestamp: datetime | None = None


class ChatSessionBase(BaseModel):
    """Common chat session fields shared across create/read models."""

    messages: list[ChatMessage] = Field(default_factory=list)
    context_budget_id: str | None = None


class ChatSessionCreate(ChatSessionBase):
    """Payload used when creating a new chat session record."""


class ChatSession(ChatSessionBase):
    """Chat session row as stored in Supabase."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime