"""API endpoints for conversation management, messaging, receipts, reactions, and disappearing message timers."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user
from app.core.ws_manager import ws_manager
from app.db.base import get_db
from app.db.models import ConversationMember, Message, User
from app.schemas.conversation import DirectConversationCreate, ConversationRead
from app.schemas.message import (
    DisappearingTimerUpdate,
    MessageCreate,
    MessageRead,
    MessageReactionRead,
    MessageStatusRead,
    ReactionToggle,
)
from app.services import conversation_service, message_service

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationRead])
async def list_conversations(
    q: Optional[str] = Query(None, description="Search term for filtering conversations"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ConversationRead]:
    """Retrieve list of user's active conversations sorted by recent activity."""
    return await conversation_service.get_user_conversations(db, current_user, q)


@router.post("/direct", response_model=ConversationRead)
async def create_or_open_direct_conversation(
    req: DirectConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Create or retrieve a 1:1 direct conversation with target user."""
    return await conversation_service.get_or_create_direct_conversation(
        db, current_user, req.recipient_id
    )


@router.get("/{id}", response_model=ConversationRead)
async def get_conversation_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Fetch metadata and member list for a single conversation."""
    return await conversation_service.get_conversation_by_id(db, current_user, id)


@router.delete("/{id}/messages")
async def clear_chat_history(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Clear all messages in a conversation."""
    return await conversation_service.clear_conversation_messages(db, current_user, id)


@router.delete("/{id}")
async def delete_single_conversation(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete conversation."""
    return await conversation_service.delete_conversation(db, current_user, id)


@router.patch("/{id}/disappearing-timer", response_model=ConversationRead)
async def update_disappearing_timer(
    id: int,
    req: DisappearingTimerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Set disappearing message timer for a conversation and broadcast WebSocket update."""
    conv_read = await message_service.set_disappearing_timer(db, current_user, id, req.timer_seconds)

    mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == id
    )
    mems_res = await db.execute(mems_stmt)
    member_uids = list(mems_res.scalars().all())

    if conv_read.last_message:
        msg_payload = {
            "type": "message:new",
            "conversation_id": id,
            "message": conv_read.last_message.model_dump(mode="json"),
        }
        await ws_manager.broadcast_to_users(member_uids, msg_payload)

    payload = {
        "type": "conversation:update",
        "conversation": conv_read.model_dump(mode="json"),
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return conv_read


@router.get("/{id}/messages", response_model=List[MessageRead])
async def fetch_conversation_messages(
    id: int,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MessageRead]:
    """Fetch message history for target conversation."""
    return await message_service.get_conversation_messages(
        db, current_user, id, limit
    )


@router.post("/{id}/messages", response_model=MessageRead)
async def post_message_to_conversation(
    id: int,
    req: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageRead:
    """Send a new text/media message and push real-time WebSocket notification to members."""
    msg = await message_service.send_message(
        db,
        current_user,
        id,
        req.content,
        req.message_type,
        req.attachment_url,
        req.attachment_type,
        req.reply_to_id,
    )

    mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == id
    )
    mems_res = await db.execute(mems_stmt)
    member_uids = list(mems_res.scalars().all())

    payload = {
        "type": "message:new",
        "conversation_id": id,
        "message": msg.model_dump(mode="json"),
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return msg


@router.patch("/{id}/read", response_model=List[MessageStatusRead])
async def mark_entire_conversation_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MessageStatusRead]:
    """Mark all unread messages in conversation as read and notify sender over WebSocket."""
    updated_statuses = await message_service.mark_conversation_read(db, current_user, id)

    if updated_statuses:
        mems_stmt = select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == id
        )
        mems_res = await db.execute(mems_stmt)
        member_uids = list(mems_res.scalars().all())

        for st in updated_statuses:
            payload = {
                "type": "message:status",
                "conversation_id": id,
                "message_id": st.message_id,
                "user_id": current_user.id,
                "status": "read",
            }
            await ws_manager.broadcast_to_users(member_uids, payload)

    return updated_statuses


messages_router = APIRouter(prefix="/messages", tags=["messages"])


@messages_router.delete("/{id}")
async def delete_single_message_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a single specific message by ID."""
    return await message_service.delete_single_message(db, current_user, id)


@messages_router.post("/{id}/reactions", response_model=List[MessageReactionRead])
async def toggle_reaction_on_message(
    id: int,
    req: ReactionToggle,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MessageReactionRead]:
    """Toggle emoji reaction on a message and broadcast WebSocket event to conversation members."""
    updated_reactions = await message_service.toggle_message_reaction(
        db, current_user, id, req.emoji
    )

    msg_stmt = select(Message.conversation_id).where(Message.id == id)
    msg_res = await db.execute(msg_stmt)
    conv_id = msg_res.scalar_one_or_none()

    if conv_id:
        mems_stmt = select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conv_id
        )
        mems_res = await db.execute(mems_stmt)
        member_uids = list(mems_res.scalars().all())

        payload = {
            "type": "message:reaction",
            "conversation_id": conv_id,
            "message_id": id,
            "reactions": [r.model_dump(mode="json") for r in updated_reactions],
        }
        await ws_manager.broadcast_to_users(member_uids, payload)

    return updated_reactions


@messages_router.patch("/{id}/delivered", response_model=MessageStatusRead)
async def mark_single_message_delivered(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageStatusRead:
    """Mark single message status as delivered and notify over WebSocket."""
    st = await message_service.mark_message_delivered(db, current_user, id)

    msg_stmt = select(Message.conversation_id).where(Message.id == id)
    msg_res = await db.execute(msg_stmt)
    conv_id = msg_res.scalar_one_or_none()

    if conv_id:
        mems_stmt = select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conv_id
        )
        mems_res = await db.execute(mems_stmt)
        member_uids = list(mems_res.scalars().all())

        payload = {
            "type": "message:status",
            "conversation_id": conv_id,
            "message_id": id,
            "user_id": current_user.id,
            "status": "delivered",
        }
        await ws_manager.broadcast_to_users(member_uids, payload)

    return st


@messages_router.patch("/{id}/read", response_model=MessageStatusRead)
async def mark_single_message_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageStatusRead:
    """Mark single message status as read and notify over WebSocket."""
    st = await message_service.mark_message_read(db, current_user, id)

    msg_stmt = select(Message.conversation_id).where(Message.id == id)
    msg_res = await db.execute(msg_stmt)
    conv_id = msg_res.scalar_one_or_none()

    if conv_id:
        mems_stmt = select(ConversationMember.user_id).where(
            ConversationMember.conversation_id == conv_id
        )
        mems_res = await db.execute(mems_stmt)
        member_uids = list(mems_res.scalars().all())

        payload = {
            "type": "message:status",
            "conversation_id": conv_id,
            "message_id": id,
            "user_id": current_user.id,
            "status": "read",
        }
        await ws_manager.broadcast_to_users(member_uids, payload)

    return st
