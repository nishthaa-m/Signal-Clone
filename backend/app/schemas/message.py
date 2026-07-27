"""Pydantic schemas for message payload validation and responses."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.db.models import MessageStatusEnum, MessageType
from app.schemas.user import UserRead


class MessageStatusRead(BaseModel):
    """Schema representing message delivery/read status receipt."""
    id: int
    message_id: int
    user_id: int
    status: MessageStatusEnum
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageReactionRead(BaseModel):
    """Schema representing an emoji reaction on a message."""
    id: int
    message_id: int
    user_id: int
    emoji: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReactionToggle(BaseModel):
    """Request payload for toggling an emoji reaction."""
    emoji: str


class MessageCreate(BaseModel):
    """Request payload for creating/sending a message."""
    content: str = ""
    message_type: MessageType = MessageType.TEXT
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    reply_to_id: Optional[int] = None


class MessageReplySummary(BaseModel):
    """Lightweight summary of a quoted reply-to message."""
    id: int
    sender_id: int
    content: str
    sender: Optional[UserRead] = None
    attachment_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MessageRead(BaseModel):
    """Response model representing a full message entity."""
    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: MessageType
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None
    reply_to_id: Optional[int] = None
    reply_to: Optional[MessageReplySummary] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    sender: Optional[UserRead] = None
    statuses: List[MessageStatusRead] = []
    reactions: List[MessageReactionRead] = []

    model_config = ConfigDict(from_attributes=True)


class DisappearingTimerUpdate(BaseModel):
    """Payload for updating disappearing message timer on a conversation."""
    timer_seconds: int
