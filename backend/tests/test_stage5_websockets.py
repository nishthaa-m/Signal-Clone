"""Stage 5 verification script: Test real-time WebSockets with live Uvicorn server."""

import asyncio
import json
import os
import sys
import threading
import httpx
import uvicorn
import websockets

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.base import engine, Base
from app.db.seed import seed_database_if_empty

SERVER_PORT = 8888
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"
WS_URL = f"ws://127.0.0.1:{SERVER_PORT}"


class UvicornTestServer(threading.Thread):
    """Background thread running Uvicorn server for WebSocket integration testing."""

    def __init__(self):
        super().__init__()
        self.config = uvicorn.Config(app, host="127.0.0.1", port=SERVER_PORT, log_level="warning")
        self.server = uvicorn.Server(self.config)

    def run(self):
        self.server.run()

    def stop(self):
        self.server.should_exit = True


async def recv_event_of_type(ws, expected_type: str, timeout: float = 5.0) -> dict:
    """Helper to receive next WebSocket frame matching expected event type."""
    start = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start < timeout:
        raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
        data = json.loads(raw)
        if data.get("type") == expected_type:
            return data
    raise TimeoutError(f"Did not receive expected event '{expected_type}' in {timeout}s")


async def run_stage5_verification():
    """Execute complete end-to-end verification of Stage 5 WebSocket real-time capabilities."""
    print("=== Stage 5 Verification Starting ===")

    # Reset and seed database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    from app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    # Start Uvicorn background server
    server_thread = UvicornTestServer()
    server_thread.daemon = True
    server_thread.start()
    await asyncio.sleep(1.5)  # Allow server to initialize

    try:
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # Login as Alice (+15550001) & Bob (+15550002)
            res_alice = await client.post("/auth/verify-otp", json={"phone_number": "+15550001", "otp": "123456"})
            alice_token = res_alice.json()["access_token"]
            headers_alice = {"Authorization": f"Bearer {alice_token}"}

            res_bob = await client.post("/auth/verify-otp", json={"phone_number": "+15550002", "otp": "123456"})
            bob_token = res_bob.json()["access_token"]
            headers_bob = {"Authorization": f"Bearer {bob_token}"}

            # 1. Connect Alice to WebSocket
            async with websockets.connect(f"{WS_URL}/ws/{alice_token}") as ws_alice:
                print("[OK] Connected Alice to WebSocket /ws/{token}")

                # 2. Connect Bob to WebSocket -> Alice receives presence event
                async with websockets.connect(f"{WS_URL}/ws/{bob_token}") as ws_bob:
                    print("[OK] Connected Bob to WebSocket /ws/{token}")

                    presence_evt = await recv_event_of_type(ws_alice, "presence")
                    assert presence_evt["user_id"] == 2
                    assert presence_evt["is_online"] is True
                    print("[OK] Received presence online event for Bob over WebSocket")

                    # 3. Post message via REST API (Alice -> Conversation 1)
                    post_res = await client.post(
                        "/conversations/1/messages",
                        json={"content": "Real-time WS push check!"},
                        headers=headers_alice,
                    )
                    assert post_res.status_code == 200

                    # Both Alice and Bob receive message:new event
                    alice_msg_evt = await recv_event_of_type(ws_alice, "message:new")
                    bob_msg_evt = await recv_event_of_type(ws_bob, "message:new")

                    assert alice_msg_evt["type"] == "message:new"
                    assert bob_msg_evt["type"] == "message:new"
                    assert bob_msg_evt["message"]["content"] == "Real-time WS push check!"
                    print("[OK] Received real-time 'message:new' event over WebSocket on both connections")

                    # 4. Bob sends typing event over WebSocket
                    await ws_bob.send(json.dumps({"type": "typing", "conversation_id": 1, "is_typing": True}))

                    typing_evt = await recv_event_of_type(ws_alice, "typing")
                    assert typing_evt["conversation_id"] == 1
                    assert typing_evt["user_id"] == 2
                    assert typing_evt["is_typing"] is True
                    print("[OK] Received real-time 'typing' indicator event over WebSocket")

                    # 5. Bob marks conversation 1 read via REST -> Alice receives message:status event
                    read_res = await client.patch("/conversations/1/read", headers=headers_bob)
                    assert read_res.status_code == 200

                    status_evt = await recv_event_of_type(ws_alice, "message:status")
                    assert status_evt["status"] == "read"
                    print("[OK] Received real-time 'message:status' read receipt event over WebSocket")

                # 6. After Bob disconnects, Alice receives offline presence event
                offline_evt = await recv_event_of_type(ws_alice, "presence")
                assert offline_evt["user_id"] == 2
                assert offline_evt["is_online"] is False
                print("[OK] Received presence offline event after user disconnected")

    finally:
        server_thread.stop()

    print("=== Stage 5 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(run_stage5_verification())
