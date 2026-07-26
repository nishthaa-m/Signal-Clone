"""WebSocket endpoint handling JWT authentication, presence tracking, typing indicators, keep-alive, and disconnect events."""

import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.future import select

from app.core.security import decode_access_token
from app.core.ws_manager import ws_manager
from app.db.base import AsyncSessionLocal
from app.db.models import ConversationMember, User

router = APIRouter(tags=["websockets"])


async def get_user_comember_ids(db, user_id: int) -> List[int]:
    """Find all user IDs sharing conversations with target user."""
    conv_ids_stmt = select(ConversationMember.conversation_id).where(
        ConversationMember.user_id == user_id
    )
    conv_ids_res = await db.execute(conv_ids_stmt)
    conv_ids = list(conv_ids_res.scalars().all())

    if not conv_ids:
        return []

    comems_stmt = select(ConversationMember.user_id).where(
        ConversationMember.conversation_id.in_(conv_ids)
    )
    comems_res = await db.execute(comems_stmt)
    return list(set(comems_res.scalars().all()) - {user_id})


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """Authenticate WebSocket connection via JWT query/path token and manage presence lifecycle."""
    token_data = decode_access_token(token)
    user_id = None
    if token_data:
        if isinstance(token_data, dict):
            user_id = token_data.get("user_id") or (int(token_data["sub"]) if "sub" in token_data else None)
        else:
            user_id = getattr(token_data, "user_id", None)

    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Register connection
    await ws_manager.connect(user_id, websocket)

    # Set user online in database and broadcast presence event
    async with AsyncSessionLocal() as db:
        user_stmt = select(User).where(User.id == user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if user:
            user.is_online = True
            await db.commit()

        comember_ids = await get_user_comember_ids(db, user_id)

    presence_event = {
        "type": "presence",
        "user_id": user_id,
        "is_online": True,
    }
    await ws_manager.broadcast_to_users(comember_ids, presence_event)

    try:
        while True:
            raw_text = await websocket.receive_text()
            if not raw_text:
                continue

            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            evt_type = data.get("type")

            if evt_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            elif evt_type == "typing":
                conversation_id = data.get("conversation_id")
                is_typing = data.get("is_typing", False)
                if conversation_id:
                    async with AsyncSessionLocal() as db:
                        mems_stmt = select(ConversationMember.user_id).where(
                            ConversationMember.conversation_id == conversation_id
                        )
                        mems_res = await db.execute(mems_stmt)
                        member_uids = list(mems_res.scalars().all())

                    payload = {
                        "type": "typing",
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "is_typing": is_typing,
                    }
                    await ws_manager.broadcast_to_users(
                        [uid for uid in member_uids if uid != user_id], payload
                    )

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(user_id, websocket)

        # Check if user has no remaining active WebSocket connections (e.g. closed all tabs)
        if not ws_manager.is_user_connected(user_id):
            now = datetime.now(timezone.utc)
            async with AsyncSessionLocal() as db:
                user_stmt = select(User).where(User.id == user_id)
                user_res = await db.execute(user_stmt)
                user = user_res.scalar_one_or_none()

                if user:
                    user.is_online = False
                    user.last_seen = now
                    await db.commit()

                comember_ids = await get_user_comember_ids(db, user_id)

            offline_presence_event = {
                "type": "presence",
                "user_id": user_id,
                "is_online": False,
                "last_seen": now.isoformat(),
            }
            await ws_manager.broadcast_to_users(comember_ids, offline_presence_event)
