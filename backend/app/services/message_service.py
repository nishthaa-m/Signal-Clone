"""Service module handling message delivery and status receipt progression."""

from datetime import datetime, timezone
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.ws_manager import ws_manager
from app.db.models import (
    Conversation,
    ConversationMember,
    ConversationType,
    Message,
    MessageStatus,
    MessageStatusEnum,
    MessageType,
    User,
)
from app.schemas.message import MessageRead, MessageStatusRead


async def send_message(
    db: AsyncSession,
    sender: User,
    conversation_id: int,
    content: str,
    message_type: MessageType = MessageType.TEXT,
) -> MessageRead:
    """Create and persist a message and create initial status receipts for recipient members."""
    mem_stmt = select(ConversationMember).where(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == sender.id,
    )
    mem_res = await db.execute(mem_stmt)
    if not mem_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this conversation",
        )

    now = datetime.now(timezone.utc)
    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender.id,
        content=content.strip(),
        message_type=message_type,
        created_at=now,
    )
    db.add(msg)
    await db.flush()  # Flush to generate msg.id primary key

    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one()
    conv.updated_at = now

    all_mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == conversation_id
    )
    all_mems_res = await db.execute(all_mems_stmt)
    all_member_ids = list(all_mems_res.scalars().all())

    for uid in all_member_ids:
        if uid != sender.id:
            # If recipient is online, mark as DELIVERED immediately
            initial_status = (
                MessageStatusEnum.DELIVERED
                if ws_manager.is_user_connected(uid)
                else MessageStatusEnum.SENT
            )
            st = MessageStatus(
                message_id=msg.id,
                user_id=uid,
                status=initial_status,
                updated_at=now,
            )
            db.add(st)

    await db.commit()

    stmt = (
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
        )
        .where(Message.id == msg.id)
    )
    res = await db.execute(stmt)
    full_msg = res.scalar_one()

    return MessageRead.model_validate(full_msg)


async def get_conversation_messages(
    db: AsyncSession, current_user: User, conversation_id: int, limit: int = 50
) -> List[MessageRead]:
    """Fetch message history for conversation after verifying user membership."""
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
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
        )
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    msgs = res.scalars().all()

    return [MessageRead.model_validate(m) for m in msgs]


async def mark_conversation_read(
    db: AsyncSession, current_user: User, conversation_id: int
) -> List[MessageStatusRead]:
    """Mark all unread messages in target conversation as READ for current user."""
    stmt = (
        select(MessageStatus)
        .join(Message, MessageStatus.message_id == Message.id)
        .where(
            Message.conversation_id == conversation_id,
            MessageStatus.user_id == current_user.id,
            MessageStatus.status != MessageStatusEnum.READ,
        )
    )
    res = await db.execute(stmt)
    statuses = res.scalars().all()

    now = datetime.now(timezone.utc)
    updated: List[MessageStatusRead] = []
    for st in statuses:
        st.status = MessageStatusEnum.READ
        st.updated_at = now
        updated.append(MessageStatusRead.model_validate(st))

    await db.commit()
    return updated


async def mark_message_delivered(
    db: AsyncSession, current_user: User, message_id: int
) -> MessageStatusRead:
    """Update message status to DELIVERED for target user."""
    stmt = select(MessageStatus).where(
        MessageStatus.message_id == message_id,
        MessageStatus.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    st = res.scalar_one_or_none()

    if not st:
        st = MessageStatus(
            message_id=message_id,
            user_id=current_user.id,
            status=MessageStatusEnum.DELIVERED,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(st)
    else:
        if st.status != MessageStatusEnum.READ:
            st.status = MessageStatusEnum.DELIVERED
            st.updated_at = datetime.now(timezone.utc)

    await db.commit()
    return MessageStatusRead.model_validate(st)


async def mark_message_read(
    db: AsyncSession, current_user: User, message_id: int
) -> MessageStatusRead:
    """Update message status to READ for target user."""
    stmt = select(MessageStatus).where(
        MessageStatus.message_id == message_id,
        MessageStatus.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    st = res.scalar_one_or_none()

    if not st:
        st = MessageStatus(
            message_id=message_id,
            user_id=current_user.id,
            status=MessageStatusEnum.READ,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(st)
    else:
        st.status = MessageStatusEnum.READ
        st.updated_at = datetime.now(timezone.utc)

    await db.commit()
    return MessageStatusRead.model_validate(st)
