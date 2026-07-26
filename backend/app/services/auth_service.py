"""Service module handling authentication logic, OTP verification, and JWT session generation."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import create_access_token
from app.db.models import User
from app.schemas.auth import OTPResponse, ProfileSetupRequest
from app.schemas.user import TokenResponse, UserRead


async def request_otp(db: AsyncSession, phone_number: str) -> OTPResponse:
    """Simulate sending an OTP to a phone number (fixed code: 123456)."""
    clean_phone = phone_number.strip()
    if not clean_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number cannot be empty",
        )
    return OTPResponse(
        message=f"OTP sent successfully to {clean_phone}",
        otp=settings.FIXED_OTP,
    )


async def verify_otp(
    db: AsyncSession, phone_number: str, otp: str
) -> TokenResponse:
    """Verify provided OTP and issue JWT access token, creating user if new."""
    if otp != settings.FIXED_OTP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please use 123456.",
        )

    clean_phone = phone_number.strip()
    result = await db.execute(select(User).where(User.phone_number == clean_phone))
    user = result.scalar_one_or_none()

    if not user:
        # Register new user
        user = User(
            phone_number=clean_phone,
            display_name=clean_phone,  # default display name until profile setup
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Issue JWT token
    access_token = create_access_token(data={"sub": str(user.id)})
    user_read = UserRead.model_validate(user)

    return TokenResponse(access_token=access_token, token_type="bearer", user=user_read)


async def setup_profile(
    db: AsyncSession, current_user: User, req: ProfileSetupRequest
) -> UserRead:
    """Update profile fields (display name and optional avatar URL) for authenticated user."""
    current_user.display_name = req.display_name
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url

    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)
