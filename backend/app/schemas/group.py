"""Pydantic schemas for group chat creation, updating, and member management."""

from typing import List, Optional
from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    """Schema for creating a new group conversation."""
    name: str = Field(..., min_length=1, max_length=128, example="Signal Core Dev Team")
    avatar_url: Optional[str] = Field(None, example="https://api.dicebear.com/7.x/identicon/svg?seed=SignalGroup")
    member_ids: List[int] = Field(default_factory=list, example=[2, 3])


class GroupUpdate(BaseModel):
    """Schema for updating group metadata (name & avatar)."""
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    avatar_url: Optional[str] = None


class GroupMemberAdd(BaseModel):
    """Schema for adding new members to an existing group."""
    user_ids: List[int] = Field(..., min_items=1, example=[4, 5])
