"""Pydantic schemas for conversation management and member validation."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.db.models import ConversationType, MemberRole
from app.schemas.message import MessageRead
from app.schemas.user import UserRead


class DirectConversationCreate(BaseModel):
    """Request payload to initiate or retrieve a 1:1 direct conversation."""
    recipient_id: int


class ConversationMemberRead(BaseModel):
    """Schema representing a single member within a conversation."""
    id: int
    conversation_id: int
    user_id: int
    role: MemberRole
    joined_at: datetime
    user: Optional[UserRead] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationRead(BaseModel):
    """Response model representing a conversation summary with last message and unread count."""
    id: int
    type: ConversationType
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    disappearing_timer: int = 0
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberRead] = []
    last_message: Optional[MessageRead] = None
    unread_count: int = 0

    model_config = ConfigDict(from_attributes=True)
