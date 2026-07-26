"""API endpoints for conversation management, messaging, receipts, and deletion with WebSocket fan-out."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user
from app.core.ws_manager import ws_manager
from app.db.base import get_db
from app.db.models import ConversationMember, Message, User
from app.schemas.conversation import DirectConversationCreate, ConversationRead
from app.schemas.message import MessageCreate, MessageRead, MessageStatusRead
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
    """Send a new text or system message and push real-time WebSocket notification to members."""
    msg = await message_service.send_message(
        db, current_user, id, req.content, req.message_type
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
