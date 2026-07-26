"""Pydantic schemas for user and contact representation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    """Schema for creating a new user record."""
    phone_number: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user profile fields."""
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRead(BaseModel):
    """Schema for reading user profile details."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: bool
    last_seen: datetime
    created_at: datetime


class TokenResponse(BaseModel):
    """Token response payload returned upon successful auth."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ContactCreate(BaseModel):
    """Schema for adding a new contact by phone number or username."""
    phone_or_username: str = Field(..., example="+15550002")
    nickname: Optional[str] = Field(None, example="Bobby")


class ContactRead(BaseModel):
    """Schema for returning contact details along with target user profile."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    contact_user_id: int
    nickname: Optional[str] = None
    created_at: datetime
    contact_user: UserRead
