"""Service module handling dual Phone OR Username authentication logic, OTP verification, and JWT session generation."""

from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import create_access_token
from app.db.models import User
from app.schemas.auth import OTPResponse, ProfileSetupRequest
from app.schemas.user import TokenResponse, UserRead


def extract_identifier(phone_number: Optional[str] = None, identifier: Optional[str] = None) -> str:
    """Extract and validate non-empty phone or username identifier."""
    val = (identifier or phone_number or "").strip()
    if not val:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number or username is required",
        )
    return val


async def request_otp(
    db: AsyncSession, phone_number: Optional[str] = None, identifier: Optional[str] = None
) -> OTPResponse:
    """Simulate sending an OTP to a phone number or username (fixed code: 123456)."""
    val = extract_identifier(phone_number, identifier)
    return OTPResponse(
        message=f"OTP sent successfully to {val}",
        otp=settings.FIXED_OTP,
    )


async def verify_otp(
    db: AsyncSession,
    phone_number: Optional[str] = None,
    identifier: Optional[str] = None,
    otp: str = "123456",
) -> TokenResponse:
    """Verify provided OTP and issue JWT access token, looking up by phone or username."""
    if otp != settings.FIXED_OTP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please use 123456.",
        )

    val = extract_identifier(phone_number, identifier)
    clean_digits = val.replace("+", "").replace("-", "").replace(" ", "")

    norm_phone = val if val.startswith("+") else f"+{val}"
    norm_phone_us = f"+1{clean_digits}" if len(clean_digits) == 10 else norm_phone

    stmt = select(User).where(
        (User.phone_number == val)
        | (User.phone_number == norm_phone)
        | (User.phone_number == norm_phone_us)
        | (User.username == val.lower())
    )
    res = await db.execute(stmt)
    user = res.scalars().first()

    if not user:
        # Create new user account for new phone or username
        if clean_digits.isdigit():
            phone = norm_phone_us if len(clean_digits) == 10 else norm_phone
            user = User(
                phone_number=phone,
                display_name=phone,
            )
        else:
            phone = f"+1555{abs(hash(val)) % 10000000:07d}"
            user = User(
                phone_number=phone,
                username=val.lower(),
                display_name=val,
            )
        db.add(user)
        await db.commit()
        await db.refresh(user)

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
