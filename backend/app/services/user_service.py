"""Service module handling user profile queries, search, and contact list operations."""

from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.models import Contact, User
from app.schemas.user import ContactCreate, ContactRead, UserRead, UserUpdate


async def get_me(current_user: User) -> UserRead:
    """Return profile representation of currently authenticated user."""
    return UserRead.model_validate(current_user)


async def update_me(
    db: AsyncSession, current_user: User, req: UserUpdate
) -> UserRead:
    """Update profile fields for currently authenticated user."""
    if req.display_name is not None:
        current_user.display_name = req.display_name
    if req.username is not None:
        # Check username uniqueness if changing
        if req.username != current_user.username:
            existing = await db.execute(
                select(User).where(User.username == req.username)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )
        current_user.username = req.username
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url

    await db.commit()
    await db.refresh(current_user)
    return UserRead.model_validate(current_user)


async def search_users(
    db: AsyncSession, current_user: User, query: Optional[str] = None
) -> List[UserRead]:
    """Search for registered users by phone number, username, or display name."""
    clean_query = query.strip() if query else ""
    if not clean_query:
        stmt = select(User).where(User.id != current_user.id).limit(50)
        result = await db.execute(stmt)
        users = result.scalars().all()
        return [UserRead.model_validate(u) for u in users]

    stmt = (
        select(User)
        .where(
            User.id != current_user.id,
            or_(
                User.phone_number.icontains(clean_query),
                User.username.icontains(clean_query),
                User.display_name.icontains(clean_query),
            ),
        )
        .limit(20)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserRead.model_validate(u) for u in users]


async def add_contact(
    db: AsyncSession, current_user: User, req: ContactCreate
) -> ContactRead:
    """Add a target user to current user's contact list by phone or username."""
    target_identifier = req.phone_or_username.strip()

    stmt = select(User).where(
        or_(
            User.phone_number == target_identifier,
            User.username == target_identifier,
        )
    )
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with given phone or username not found",
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a contact",
        )

    # Check if contact relationship already exists
    existing_contact = await db.execute(
        select(Contact).where(
            Contact.user_id == current_user.id,
            Contact.contact_user_id == target_user.id,
        )
    )
    if existing_contact.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact already added",
        )

    contact = Contact(
        user_id=current_user.id,
        contact_user_id=target_user.id,
        nickname=req.nickname,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    # Load contact_user relationship for Pydantic validation
    stmt_contact = (
        select(Contact)
        .options(selectinload(Contact.contact_user))
        .where(Contact.id == contact.id)
    )
    res_contact = await db.execute(stmt_contact)
    loaded_contact = res_contact.scalar_one()

    return ContactRead.model_validate(loaded_contact)


async def get_contacts(db: AsyncSession, current_user: User) -> List[ContactRead]:
    """Retrieve list of saved contacts for currently authenticated user."""
    stmt = (
        select(Contact)
        .options(selectinload(Contact.contact_user))
        .where(Contact.user_id == current_user.id)
        .order_by(Contact.created_at.desc())
    )
    result = await db.execute(stmt)
    contacts = result.scalars().all()
    return [ContactRead.model_validate(c) for c in contacts]
