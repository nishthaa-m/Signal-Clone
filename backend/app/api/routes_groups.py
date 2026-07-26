"""API endpoints for group creation, member administration, metadata updates, and group deletion."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user
from app.core.ws_manager import ws_manager
from app.db.base import get_db
from app.db.models import ConversationMember, User
from app.schemas.conversation import ConversationRead
from app.schemas.group import GroupCreate, GroupMemberAdd
from app.services import group_service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=ConversationRead)
async def create_new_group(
    req: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Create a new group conversation with caller as admin and send real-time notification."""
    group_read = await group_service.create_group(db, current_user, req)

    member_uids = [m.user_id for m in group_read.members]
    payload = {
        "type": "conversation:new",
        "conversation": group_read.model_dump(mode="json"),
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return group_read


@router.post("/{id}/members", response_model=ConversationRead)
async def add_members_to_group(
    id: int,
    req: GroupMemberAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Add new members to existing group (Admin only) and push WebSocket update."""
    group_read = await group_service.add_group_members(db, current_user, id, req)

    member_uids = [m.user_id for m in group_read.members]
    payload = {
        "type": "conversation:update",
        "conversation": group_read.model_dump(mode="json"),
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return group_read


@router.delete("/{id}/members/{user_id}", response_model=ConversationRead)
async def remove_member_from_group(
    id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationRead:
    """Remove member from group (Admin only) or leave group (self) with WebSocket fan-out."""
    group_read = await group_service.remove_group_member(db, current_user, id, user_id)

    member_uids = [m.user_id for m in group_read.members] + [user_id]
    payload = {
        "type": "conversation:update",
        "conversation": group_read.model_dump(mode="json"),
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return group_read


@router.delete("/{id}")
async def delete_entire_group(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete an entire group conversation (Admin only)."""
    # Get members before deletion for WebSocket notification
    mems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id == id
    )
    mems_res = await db.execute(mems_stmt)
    member_uids = list(mems_res.scalars().all())

    res = await group_service.delete_group(db, current_user, id)

    payload = {
        "type": "conversation:delete",
        "conversation_id": id,
    }
    await ws_manager.broadcast_to_users(member_uids, payload)

    return res
