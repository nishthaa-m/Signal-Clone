"""Pydantic schemas for messages and message status receipts."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.db.models import MessageStatusEnum, MessageType
from app.schemas.user import UserRead


class MessageStatusRead(BaseModel):
    """Schema for returning message delivery and read status."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    message_id: int
    user_id: int
    status: MessageStatusEnum
    updated_at: datetime


class MessageCreate(BaseModel):
    """Schema for sending a new message to a conversation."""
    content: str = Field(..., min_length=1)
    message_type: MessageType = MessageType.TEXT


class MessageRead(BaseModel):
    """Schema for returning message content along with sender and recipient status list."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: MessageType
    created_at: datetime
    sender: UserRead
    statuses: List[MessageStatusRead] = []
