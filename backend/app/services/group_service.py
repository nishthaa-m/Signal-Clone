"""Service module handling group creation, admin permission checks, member add/remove operations, and group deletion."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.models import (
    Conversation,
    ConversationMember,
    ConversationType,
    MemberRole,
    Message,
    MessageType,
    User,
)
from app.schemas.conversation import ConversationMemberRead, ConversationRead
from app.schemas.group import GroupCreate, GroupMemberAdd, GroupUpdate
from app.schemas.message import MessageRead


async def create_group(
    db: AsyncSession, current_user: User, req: GroupCreate
) -> ConversationRead:
    """Create a new group conversation with creator as ADMIN and specified contacts as MEMBERS."""
    now = datetime.now(timezone.utc)
    conv = Conversation(
        type=ConversationType.GROUP,
        name=req.name.strip(),
        avatar_url=req.avatar_url,
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    admin_member = ConversationMember(
        conversation_id=conv.id,
        user_id=current_user.id,
        role=MemberRole.ADMIN,
        joined_at=now,
    )
    db.add(admin_member)

    added_user_ids = set(req.member_ids)
    added_user_ids.discard(current_user.id)

    if added_user_ids:
        users_stmt = select(User).where(User.id.in_(list(added_user_ids)))
        users_res = await db.execute(users_stmt)
        valid_users = users_res.scalars().all()

        for u in valid_users:
            mem = ConversationMember(
                conversation_id=conv.id,
                user_id=u.id,
                role=MemberRole.MEMBER,
                joined_at=now,
            )
            db.add(mem)

    sys_msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=f"{current_user.display_name or current_user.username or current_user.phone_number} created the group '{conv.name}'",
        message_type=MessageType.SYSTEM,
        created_at=now,
    )
    db.add(sys_msg)
    await db.commit()

    return await get_group_conversation_read(db, current_user, conv.id)


async def add_group_members(
    db: AsyncSession, current_user: User, conversation_id: int, req: GroupMemberAdd
) -> ConversationRead:
    """Add new users to an existing group; requires caller to be an ADMIN."""
    caller_mem = await get_group_member_role(db, conversation_id, current_user.id)
    if not caller_mem or caller_mem.role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can add new members",
        )

    existing_mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == conversation_id
    )
    existing_res = await db.execute(existing_mems_stmt)
    existing_uids = set(existing_res.scalars().all())

    new_uids = [uid for uid in req.user_ids if uid not in existing_uids]
    if not new_uids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All specified users are already in the group",
        )

    users_stmt = select(User).where(User.id.in_(new_uids))
    users_res = await db.execute(users_stmt)
    new_users = users_res.scalars().all()

    now = datetime.now(timezone.utc)
    added_names = []
    for u in new_users:
        mem = ConversationMember(
            conversation_id=conversation_id,
            user_id=u.id,
            role=MemberRole.MEMBER,
            joined_at=now,
        )
        db.add(mem)
        added_names.append(u.display_name or u.username or u.phone_number)

    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one()
    conv.updated_at = now

    caller_name = current_user.display_name or current_user.username or current_user.phone_number
    sys_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{caller_name} added {', '.join(added_names)} to the group",
        message_type=MessageType.SYSTEM,
        created_at=now,
    )
    db.add(sys_msg)
    await db.commit()

    return await get_group_conversation_read(db, current_user, conversation_id)


async def remove_group_member(
    db: AsyncSession, current_user: User, conversation_id: int, target_user_id: int
) -> ConversationRead:
    """Remove a member from group; caller must be ADMIN unless removing themselves (leaving)."""
    caller_mem = await get_group_member_role(db, conversation_id, current_user.id)
    if not caller_mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this group",
        )

    is_self_removal = current_user.id == target_user_id
    if not is_self_removal and caller_mem.role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can remove other members",
        )

    target_mem = await get_group_member_role(db, conversation_id, target_user_id)
    if not target_mem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user is not a member of this group",
        )

    target_u = target_mem.user
    await db.delete(target_mem)

    now = datetime.now(timezone.utc)
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one()
    conv.updated_at = now

    caller_name = current_user.display_name or current_user.username or current_user.phone_number
    target_name = target_u.display_name or target_u.username or target_u.phone_number if target_u else f"User {target_user_id}"

    content = f"{caller_name} left the group" if is_self_removal else f"{caller_name} removed {target_name} from the group"

    sys_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content,
        message_type=MessageType.SYSTEM,
        created_at=now,
    )
    db.add(sys_msg)
    await db.commit()

    return await get_group_conversation_read(db, current_user, conversation_id, allow_ex_member=is_self_removal)


async def delete_group(
    db: AsyncSession, current_user: User, conversation_id: int
) -> dict[str, str]:
    """Delete an entire group conversation; requires caller to be group ADMIN."""
    caller_mem = await get_group_member_role(db, conversation_id, current_user.id)
    if not caller_mem or caller_mem.role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group admins can delete the group",
        )

    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one_or_none()

    if conv:
        await db.delete(conv)
        await db.commit()

    return {"message": "Group deleted successfully"}


async def get_group_member_role(
    db: AsyncSession, conversation_id: int, user_id: int
) -> Optional[ConversationMember]:
    stmt = (
        select(ConversationMember)
        .options(selectinload(ConversationMember.user))
        .where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_group_conversation_read(
    db: AsyncSession, current_user: User, conversation_id: int, allow_ex_member: bool = False
) -> ConversationRead:
    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user)
        )
        .where(Conversation.id == conversation_id)
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group conversation not found",
        )

    last_msg_stmt = (
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
        )
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_msg_res = await db.execute(last_msg_stmt)
    last_msg = last_msg_res.scalar_one_or_none()

    return ConversationRead(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        avatar_url=conv.avatar_url,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=[ConversationMemberRead.model_validate(m) for m in conv.members],
        last_message=MessageRead.model_validate(last_msg) if last_msg else None,
        unread_count=0,
    )
