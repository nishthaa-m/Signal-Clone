"""Pydantic schemas for authentication requests and responses."""

from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """Schema for user registration request."""
    phone_number: str = Field(..., example="+15550001")
    username: Optional[str] = Field(None, example="alice")


class LoginRequest(BaseModel):
    """Schema for requesting a login OTP."""
    phone_number: str = Field(..., example="+15550001")


class OTPVerifyRequest(BaseModel):
    """Schema for submitting phone number and OTP code."""
    phone_number: str = Field(..., example="+15550001")
    otp: str = Field(..., example="123456")


class OTPResponse(BaseModel):
    """Response returned upon requesting an OTP."""
    message: str
    otp: str


class ProfileSetupRequest(BaseModel):
    """Schema for updating initial profile (display name & avatar)."""
    display_name: str = Field(..., example="Alice Smith")
    avatar_url: Optional[str] = Field(None, example="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice")
