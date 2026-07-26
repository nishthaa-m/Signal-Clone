"""User management and contacts API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.base import get_db
from app.db.models import User
from app.schemas.user import ContactCreate, ContactRead, UserRead, UserUpdate
from app.services import user_service

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserRead)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Fetch current authenticated user profile."""
    return await user_service.get_me(current_user)


@router.patch("/users/me", response_model=UserRead)
async def update_my_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Update profile fields for authenticated user."""
    return await user_service.update_me(db, current_user, req)


@router.get("/users/search", response_model=List[UserRead])
async def search_users_list(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[UserRead]:
    """Search registered users by phone, username, or display name."""
    return await user_service.search_users(db, current_user, q)


@router.post("/contacts", response_model=ContactRead)
async def add_new_contact(
    req: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContactRead:
    """Add a target user to contacts by phone or username."""
    return await user_service.add_contact(db, current_user, req)


@router.get("/contacts", response_model=List[ContactRead])
async def list_user_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ContactRead]:
    """Retrieve list of saved contacts for current user."""
    return await user_service.get_contacts(db, current_user)
