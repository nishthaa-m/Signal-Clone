"""Service module handling message delivery, attachments, reactions, reply-to, single deletion, and disappearing message timers."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
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
    MessageReaction,
    MessageStatus,
    MessageStatusEnum,
    MessageType,
    User,
)
from app.schemas.conversation import ConversationRead
from app.schemas.message import MessageRead, MessageReactionRead, MessageStatusRead


async def send_message(
    db: AsyncSession,
    sender: User,
    conversation_id: int,
    content: str,
    message_type: MessageType = MessageType.TEXT,
    attachment_url: Optional[str] = None,
    attachment_type: Optional[str] = None,
    reply_to_id: Optional[int] = None,
) -> MessageRead:
    """Create and persist a message with optional attachments, reply-to ID, and expiring timer."""
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

    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one()
    conv.updated_at = now

    expires_at = None
    # System messages MUST NEVER expire! Only text and attachments expire.
    if conv.disappearing_timer > 0 and message_type != MessageType.SYSTEM:
        expires_at = now + timedelta(seconds=conv.disappearing_timer)

    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender.id,
        content=content.strip(),
        message_type=message_type,
        attachment_url=attachment_url,
        attachment_type=attachment_type,
        reply_to_id=reply_to_id,
        expires_at=expires_at,
        created_at=now,
    )
    db.add(msg)
    await db.flush()  # Flush to generate msg.id primary key

    all_mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == conversation_id
    )
    all_mems_res = await db.execute(all_mems_stmt)
    all_member_ids = list(all_mems_res.scalars().all())

    for uid in all_member_ids:
        if uid != sender.id:
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
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(Message.id == msg.id)
    )
    res = await db.execute(stmt)
    full_msg = res.scalar_one()

    return MessageRead.model_validate(full_msg)


async def delete_single_message(
    db: AsyncSession, current_user: User, message_id: int
) -> dict[str, str]:
    """Delete a specific message if caller is sender or group admin, and broadcast deletion over WebSocket."""
    msg_stmt = (
        select(Message)
        .options(selectinload(Message.conversation).selectinload(Conversation.members))
        .where(Message.id == message_id)
    )
    msg_res = await db.execute(msg_stmt)
    msg = msg_res.scalar_one_or_none()

    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    is_sender = msg.sender_id == current_user.id
    current_mem = next(
        (m for m in msg.conversation.members if m.user_id == current_user.id), None
    )

    if not current_mem:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this conversation",
        )

    is_group_admin = (
        msg.conversation.type == ConversationType.GROUP
        and current_mem.role == MemberRole.ADMIN
    )

    if not (is_sender or is_group_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages",
        )

    conv_id = msg.conversation_id
    member_uids = [m.user_id for m in msg.conversation.members]

    await db.delete(msg)
    await db.commit()

    payload = {
        "type": "message:delete",
        "conversation_id": conv_id,
        "message_id": message_id,
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return {"message": "Message deleted successfully"}


async def toggle_message_reaction(
    db: AsyncSession, current_user: User, message_id: int, emoji: str
) -> List[MessageReactionRead]:
    """Add or remove an emoji reaction on a message for current_user."""
    msg_stmt = (
        select(Message)
        .options(selectinload(Message.reactions))
        .where(Message.id == message_id)
    )
    msg_res = await db.execute(msg_stmt)
    msg = msg_res.scalar_one_or_none()

    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    mem_stmt = select(ConversationMember).where(
        ConversationMember.conversation_id == msg.conversation_id,
        ConversationMember.user_id == current_user.id,
    )
    mem_res = await db.execute(mem_stmt)
    if not mem_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this conversation",
        )

    react_stmt = select(MessageReaction).where(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == emoji,
    )
    react_res = await db.execute(react_stmt)
    existing = react_res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if existing:
        await db.delete(existing)
    else:
        new_react = MessageReaction(
            message_id=message_id,
            user_id=current_user.id,
            emoji=emoji,
            created_at=now,
        )
        db.add(new_react)

    await db.commit()

    reacts_stmt = select(MessageReaction).where(MessageReaction.message_id == message_id)
    reacts_res = await db.execute(reacts_stmt)
    updated_reacts = reacts_res.scalars().all()

    return [MessageReactionRead.model_validate(r) for r in updated_reacts]


async def set_disappearing_timer(
    db: AsyncSession, current_user: User, conversation_id: int, timer_seconds: int
) -> ConversationRead:
    """Update conversation disappearing message timer and create a system event pill."""
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

    now = datetime.now(timezone.utc)
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_res = await db.execute(conv_stmt)
    conv = conv_res.scalar_one()

    conv.disappearing_timer = timer_seconds
    conv.updated_at = now

    timer_labels = {
        0: "off",
        5: "5 seconds",
        30: "30 seconds",
        60: "1 minute",
        3600: "1 hour",
        86400: "1 day",
    }
    label = timer_labels.get(timer_seconds, f"{timer_seconds} seconds")
    user_name = current_user.display_name or current_user.username or current_user.phone_number

    sys_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{user_name} set the disappearing message timer to {label}",
        message_type=MessageType.SYSTEM,
        expires_at=None,  # System messages NEVER expire!
        created_at=now,
    )
    db.add(sys_msg)
    await db.commit()

    from app.services import conversation_service
    return await conversation_service.get_conversation_by_id(db, current_user, conversation_id)


async def get_conversation_messages(
    db: AsyncSession, current_user: User, conversation_id: int, limit: int = 50
) -> List[MessageRead]:
    """Fetch message history excluding expired disappearing messages."""
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

    now = datetime.now(timezone.utc)
    stmt = (
        select(Message)
        .options(
            selectinload(Message.sender),
            selectinload(Message.statuses),
            selectinload(Message.reactions),
            selectinload(Message.reply_to).selectinload(Message.sender),
        )
        .where(
            Message.conversation_id == conversation_id,
            (Message.expires_at == None) | (Message.expires_at > now),
        )
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

    # Broadcast read status over WebSocket to original message senders
    for st in updated:
        msg_stmt = select(Message.sender_id).where(Message.id == st.message_id)
        msg_res = await db.execute(msg_stmt)
        sender_id = msg_res.scalar_one_or_none()
        if sender_id and sender_id != current_user.id:
            payload = {
                "type": "message:status",
                "conversation_id": conversation_id,
                "message_id": st.message_id,
                "user_id": current_user.id,
                "status": "read",
            }
            await ws_manager.send_to_user(sender_id, payload)

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
