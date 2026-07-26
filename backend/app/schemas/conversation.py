"""Pydantic schemas for conversations and conversation membership."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.db.models import ConversationType, MemberRole
from app.schemas.message import MessageRead
from app.schemas.user import UserRead


class DirectConversationCreate(BaseModel):
    """Schema for creating or opening a direct 1:1 conversation."""
    recipient_id: int = Field(..., example=2)


class ConversationMemberRead(BaseModel):
    """Schema for returning conversation member details."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    user_id: int
    role: MemberRole
    joined_at: datetime
    user: UserRead


class ConversationRead(BaseModel):
    """Schema for returning conversation preview, member list, last message, and unread count."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: ConversationType
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberRead] = []
    last_message: Optional[MessageRead] = None
    unread_count: int = 0
