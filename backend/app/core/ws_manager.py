"""ConnectionManager managing active WebSocket connections per authenticated user ID."""

import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """Tracks live WebSocket connections per user ID and handles event broadcasting."""

    def __init__(self):
        # user_id -> List of active WebSocket connections (multi-tab support)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Accept WebSocket connection and store under target user ID."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Remove WebSocket connection on disconnect."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    def is_user_connected(self, user_id: int) -> bool:
        """Check if user has at least one active WebSocket connection."""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_personal_message(self, user_id: int, message: dict):
        """Send JSON event message to all active sockets of a single user."""
        if user_id in self.active_connections:
            payload = json.dumps(message)
            dead_sockets = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.append(ws)

            for ws in dead_sockets:
                self.disconnect(user_id, ws)

    async def broadcast_to_users(self, user_ids: List[int], message: dict):
        """Broadcast JSON event message to multiple user IDs."""
        for uid in set(user_ids):
            await self.send_personal_message(uid, message)


ws_manager = ConnectionManager()
