"""Authentication API endpoints for registration, OTP verification, and profile setup."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.base import get_db
from app.db.models import User
from app.schemas.auth import LoginRequest, OTPResponse, OTPVerifyRequest, ProfileSetupRequest, RegisterRequest
from app.schemas.user import TokenResponse, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=OTPResponse)
async def register_user(
    req: RegisterRequest, db: AsyncSession = Depends(get_db)
) -> OTPResponse:
    """Initiate registration flow by requesting an OTP for phone number."""
    return await auth_service.request_otp(db, req.phone_number)


@router.post("/login", response_model=OTPResponse)
async def login_user(
    req: LoginRequest, db: AsyncSession = Depends(get_db)
) -> OTPResponse:
    """Initiate login flow by requesting an OTP for phone number."""
    return await auth_service.request_otp(db, req.phone_number)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_code(
    req: OTPVerifyRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Verify OTP code (fixed 123456) and return JWT session token."""
    return await auth_service.verify_otp(db, req.phone_number, req.otp)


@router.post("/profile-setup", response_model=UserRead)
async def complete_profile_setup(
    req: ProfileSetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Set display name and avatar URL for authenticated user."""
    return await auth_service.setup_profile(db, current_user, req)
