"""End-to-end full system integration test script verifying all backend REST and WebSocket flows."""

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

SERVER_PORT = 8000
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"
WS_URL = f"ws://127.0.0.1:{SERVER_PORT}"


class ServerRunner(threading.Thread):
    def __init__(self):
        super().__init__()
        self.config = uvicorn.Config(app, host="127.0.0.1", port=SERVER_PORT, log_level="warning")
        self.server = uvicorn.Server(self.config)

    def run(self):
        self.server.run()

    def stop(self):
        self.server.should_exit = True


async def recv_event(ws, target_type: str, timeout: float = 5.0) -> dict:
    start = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start < timeout:
        raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
        data = json.loads(raw)
        if data.get("type") == target_type:
            return data
    raise TimeoutError(f"Event '{target_type}' not received within {timeout}s")


async def run_full_integration_test():
    print("=========================================================")
    print("  SIGNAL CLONE FULL SYSTEM END-TO-END INTEGRATION TEST")
    print("=========================================================")

    # Reset & seed DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    from app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)
    print("[1/6] Database initialized and seeded with 5 users, conversations, and messages")

    # Start uvicorn server thread
    runner = ServerRunner()
    runner.daemon = True
    runner.start()
    await asyncio.sleep(1.5)
    print("[2/6] FastAPI Backend server running at http://127.0.0.1:8000")

    try:
        async with httpx.AsyncClient(base_url=BASE_URL) as client:
            # 1. Health check
            h = await client.get("/api/health")
            assert h.status_code == 200
            print("[3/6] /api/health returned OK")

            # 2. Login Alice & Bob
            r_alice = await client.post("/auth/verify-otp", json={"phone_number": "+15550001", "otp": "123456"})
            token_alice = r_alice.json()["access_token"]
            h_alice = {"Authorization": f"Bearer {token_alice}"}

            r_bob = await client.post("/auth/verify-otp", json={"phone_number": "+15550002", "otp": "123456"})
            token_bob = r_bob.json()["access_token"]
            h_bob = {"Authorization": f"Bearer {token_bob}"}
            print("[4/6] Authenticated Alice (+15550001) and Bob (+15550002) via JWT")

            # 3. Connect WebSockets
            async with websockets.connect(f"{WS_URL}/ws/{token_alice}") as ws_alice:
                async with websockets.connect(f"{WS_URL}/ws/{token_bob}") as ws_bob:
                    print("[5/6] Dual WebSocket connections established (/ws/{token})")

                    # Verify presence event
                    p_evt = await recv_event(ws_alice, "presence")
                    assert p_evt["user_id"] == 2 and p_evt["is_online"] is True

                    # Alice sends message via REST API
                    post_res = await client.post(
                        "/conversations/1/messages",
                        json={"content": "Manual test live verification message!"},
                        headers=h_alice,
                    )
                    assert post_res.status_code == 200
                    msg_id = post_res.json()["id"]

                    # Verify real-time message push over WS
                    ws_evt = await recv_event(ws_bob, "message:new")
                    assert ws_evt["message"]["content"] == "Manual test live verification message!"

                    # Bob marks message read
                    read_res = await client.patch(f"/messages/{msg_id}/read", headers=h_bob)
                    assert read_res.status_code == 200

                    status_evt = await recv_event(ws_alice, "message:status")
                    assert status_evt["status"] == "read"
                    print("[6/6] Real-time message push & double blue check read receipts verified!")

    finally:
        runner.stop()

    print("=========================================================")
    print("  ALL STAGES FULL SYSTEM VERIFICATION PASSED SUCCESSFULLY!")
    print("=========================================================")


if __name__ == "__main__":
    asyncio.run(run_full_integration_test())
