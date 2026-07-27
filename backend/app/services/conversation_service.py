"""Service module managing conversation listing, 1:1 chat initialization, conversation details, and deletion."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.ws_manager import ws_manager
from app.db.models import (
    Conversation,
    ConversationMember,
    ConversationType,
    MemberRole,
    Message,
    MessageStatus,
    MessageStatusEnum,
    User,
)
from app.schemas.conversation import ConversationMemberRead, ConversationRead
from app.schemas.message import MessageRead


async def get_user_conversations(
    db: AsyncSession, current_user: User, search_query: Optional[str] = None
) -> List[ConversationRead]:
    """Fetch all conversations for current user, sorted by recent activity (updated_at desc)."""
    user_mem_stmt = select(ConversationMember.conversation_id).where(
        ConversationMember.user_id == current_user.id
    )
    user_mem_res = await db.execute(user_mem_stmt)
    conv_ids = user_mem_res.scalars().all()

    if not conv_ids:
        return []

    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user)
        )
        .where(Conversation.id.in_(conv_ids))
        .order_by(Conversation.updated_at.desc())
    )
    res = await db.execute(stmt)
    conversations = res.scalars().all()

    results: List[ConversationRead] = []
    clean_query = search_query.strip().lower() if search_query else None
    seen_direct_uids = set()
    now = datetime.now(timezone.utc)

    for conv in conversations:
        display_name = conv.name
        display_avatar = conv.avatar_url

        if conv.type == ConversationType.DIRECT:
            other_member = next(
                (m for m in conv.members if m.user_id != current_user.id), None
            )
            if other_member and other_member.user:
                # Deduplicate direct 1:1 chats by other user ID
                if other_member.user_id in seen_direct_uids:
                    continue
                seen_direct_uids.add(other_member.user_id)

                display_name = (
                    other_member.user.display_name
                    or other_member.user.username
                    or other_member.user.phone_number
                )
                display_avatar = other_member.user.avatar_url
            else:
                display_name = "Note to Self"

        if clean_query:
            matches_name = display_name and clean_query in display_name.lower()
            matches_member = any(
                m.user and (
                    (m.user.display_name and clean_query in m.user.display_name.lower())
                    or (m.user.username and clean_query in m.user.username.lower())
                    or (clean_query in m.user.phone_number)
                )
                for m in conv.members
            )
            if not (matches_name or matches_member):
                continue

        # Filter last_message by non-expired messages
        last_msg_stmt = (
            select(Message)
            .options(
                selectinload(Message.sender),
                selectinload(Message.statuses),
                selectinload(Message.reactions),
                selectinload(Message.reply_to).selectinload(Message.sender),
            )
            .where(
                Message.conversation_id == conv.id,
                (Message.expires_at == None) | (Message.expires_at > now),
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg_res = await db.execute(last_msg_stmt)
        last_msg = last_msg_res.scalar_one_or_none()

        unread_stmt = (
            select(func.count(MessageStatus.id))
            .join(Message, MessageStatus.message_id == Message.id)
            .where(
                Message.conversation_id == conv.id,
                MessageStatus.user_id == current_user.id,
                MessageStatus.status != MessageStatusEnum.READ,
            )
        )
        unread_res = await db.execute(unread_stmt)
        unread_count = unread_res.scalar_one()

        conv_read = ConversationRead(
            id=conv.id,
            type=conv.type,
            name=display_name,
            avatar_url=display_avatar,
            disappearing_timer=conv.disappearing_timer,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            members=[ConversationMemberRead.model_validate(m) for m in conv.members],
            last_message=MessageRead.model_validate(last_msg) if last_msg else None,
            unread_count=unread_count,
        )
        results.append(conv_read)

    return results


async def get_or_create_direct_conversation(
    db: AsyncSession, current_user: User, recipient_id: int
) -> ConversationRead:
    """Find existing 1:1 conversation between current user and recipient, or create a new one."""
    if recipient_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start a conversation with yourself",
        )

    recip_stmt = select(User).where(User.id == recipient_id)
    recip_res = await db.execute(recip_stmt)
    recipient = recip_res.scalar_one_or_none()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found",
        )

    c1_alias = select(ConversationMember.conversation_id).where(ConversationMember.user_id == current_user.id)
    c2_alias = select(ConversationMember.conversation_id).where(ConversationMember.user_id == recipient_id)

    stmt = (
        select(Conversation)
        .options(
            selectinload(Conversation.members).selectinload(ConversationMember.user)
        )
        .where(
            Conversation.type == ConversationType.DIRECT,
            Conversation.id.in_(c1_alias),
            Conversation.id.in_(c2_alias),
        )
        .order_by(Conversation.created_at.asc())
        .limit(1)
    )
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()

    if not conv:
        conv = Conversation(type=ConversationType.DIRECT)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

        mem1 = ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=MemberRole.MEMBER)
        mem2 = ConversationMember(conversation_id=conv.id, user_id=recipient_id, role=MemberRole.MEMBER)
        db.add_all([mem1, mem2])
        await db.commit()

    return await get_conversation_by_id(db, current_user, conv.id)


async def get_conversation_by_id(
    db: AsyncSession, current_user: User, conversation_id: int
) -> ConversationRead:
    """Retrieve single conversation detail after verifying caller membership."""
    mem_stmt = select(ConversationMember).where(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id,
    )
    mem_res = await db.execute(mem_stmt)
    if not mem_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this conversation",
        )

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
            detail="Conversation not found",
        )

    display_name = conv.name
    display_avatar = conv.avatar_url

    if conv.type == ConversationType.DIRECT:
        other_member = next(
            (m for m in conv.members if m.user_id != current_user.id), None
        )
        if other_member and other_member.user:
            display_name = (
                other_member.user.display_name
                or other_member.user.username
                or other_member.user.phone_number
            )
            display_avatar = other_member.user.avatar_url
        else:
            display_name = "Note to Self"

    now = datetime.now(timezone.utc)
    last_msg_stmt = (
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(
            Message.conversation_id == conv.id,
            (Message.expires_at == None) | (Message.expires_at > now),
        )
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_msg_res = await db.execute(last_msg_stmt)
    last_msg = last_msg_res.scalar_one_or_none()

    unread_stmt = (
        select(func.count(MessageStatus.id))
        .join(Message, MessageStatus.message_id == Message.id)
        .where(
            Message.conversation_id == conv.id,
            MessageStatus.user_id == current_user.id,
            MessageStatus.status != MessageStatusEnum.READ,
        )
    )
    unread_res = await db.execute(unread_stmt)
    unread_count = unread_res.scalar_one()

    return ConversationRead(
        id=conv.id,
        type=conv.type,
        name=display_name,
        avatar_url=display_avatar,
        disappearing_timer=conv.disappearing_timer,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=[ConversationMemberRead.model_validate(m) for m in conv.members],
        last_message=MessageRead.model_validate(last_msg) if last_msg else None,
        unread_count=unread_count,
    )


async def clear_conversation_messages(
    db: AsyncSession, current_user: User, conversation_id: int
) -> dict[str, str]:
    """Delete all messages inside a conversation (clear chat history) and broadcast WebSocket notification."""
    mem_stmt = select(ConversationMember).where(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id,
    )
    mem_res = await db.execute(mem_stmt)
    if not mem_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this conversation",
        )

    all_mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == conversation_id
    )
    all_mems_res = await db.execute(all_mems_stmt)
    member_uids = list(all_mems_res.scalars().all())

    msgs_stmt = select(Message).where(Message.conversation_id == conversation_id)
    msgs_res = await db.execute(msgs_stmt)
    msgs = msgs_res.scalars().all()

    for m in msgs:
        await db.delete(m)

    await db.commit()

    payload = {
        "type": "conversation:clear",
        "conversation_id": conversation_id,
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return {"message": "Chat history cleared successfully"}


async def delete_conversation(
    db: AsyncSession, current_user: User, conversation_id: int
) -> dict[str, str]:
    """Delete a conversation and all member associations."""
    mem_stmt = select(ConversationMember).where(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id,
    )
    mem_res = await db.execute(mem_stmt)
    if not mem_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this conversation",
        )

    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one_or_none()
    if conv:
        await db.delete(conv)
        await db.commit()

    return {"message": "Conversation deleted successfully"}
