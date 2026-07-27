"""Pydantic schemas for authentication requests and responses."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    """Schema for user registration request accepting Phone OR Username."""
    phone_number: Optional[str] = None
    identifier: Optional[str] = None
    username: Optional[str] = None

    @field_validator("identifier", mode="before")
    @classmethod
    def populate_identifier(cls, v, values):
        return v


class LoginRequest(BaseModel):
    """Schema for requesting a login OTP."""
    phone_number: Optional[str] = None
    identifier: Optional[str] = None


class OTPVerifyRequest(BaseModel):
    """Schema for submitting identifier (Phone or Username) and OTP code."""
    phone_number: Optional[str] = None
    identifier: Optional[str] = None
    otp: str = Field(..., example="123456")


class OTPResponse(BaseModel):
    """Response returned upon requesting an OTP."""
    message: str
    otp: str


class ProfileSetupRequest(BaseModel):
    """Schema for updating initial profile (display name & avatar)."""
    display_name: str = Field(..., example="Alice Smith")
    avatar_url: Optional[str] = Field(None, example="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice")
