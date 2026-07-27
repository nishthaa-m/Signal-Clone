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
    """Schema for adding new members to an existing group, accepting user_ids or member_ids."""
    user_ids: Optional[List[int]] = Field(None, example=[4, 5])
    member_ids: Optional[List[int]] = Field(None, example=[4, 5])

    @property
    def target_user_ids(self) -> List[int]:
        """Return combined target user IDs from user_ids or member_ids."""
        return self.user_ids or self.member_ids or []
