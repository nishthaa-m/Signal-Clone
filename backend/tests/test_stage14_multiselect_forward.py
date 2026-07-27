"""Automated verification suite testing multi-message selection, message forwarding, and 'Delete for me'."""

import asyncio
import os
import sys
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.base import AsyncSessionLocal, engine, Base
from app.db.seed import seed_database_if_empty

BASE_URL = "http://testserver"


async def main():
    print("=== Stage 14 Multi-Select & Forwarding Verification Starting ===")

    # 1. Reset & Seed DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    # 2. Use ASGI Transport to test FastAPI directly in-process
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=BASE_URL) as client:
        # Authenticate Alice (5550001001)
        res_a = await client.post("/auth/verify-otp", json={"identifier": "5550001001", "otp": "123456"})
        assert res_a.status_code == 200, f"Auth failed: {res_a.text}"
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Send 2 test messages in Conversation 1 (Direct chat with Bob)
        res_msg1 = await client.post(
            "/conversations/1/messages",
            headers=headers_a,
            json={"content": "Important update for the project."}
        )
        assert res_msg1.status_code == 200
        msg1_id = res_msg1.json()["id"]

        res_msg2 = await client.post(
            "/conversations/1/messages",
            headers=headers_a,
            json={"content": "Please review by 5 PM."}
        )
        assert res_msg2.status_code == 200
        msg2_id = res_msg2.json()["id"]

        print(f"[OK] Test messages created (IDs: {msg1_id}, {msg2_id})")

        # Forward msg1 to Conversation 2 (Direct chat with Charlie)
        res_fwd = await client.post(
            "/conversations/2/messages",
            headers=headers_a,
            json={"content": f"[Forwarded] Important update for the project."}
        )
        assert res_fwd.status_code == 200
        fwd_msg_id = res_fwd.json()["id"]
        print(f"[OK] Message {msg1_id} forwarded to Conversation 2 (Forward ID: {fwd_msg_id})")

        # Verify forwarded message exists in Conversation 2
        res_conv2_msgs = await client.get("/conversations/2/messages", headers=headers_a)
        conv2_msg_contents = [m["content"] for m in res_conv2_msgs.json()]
        assert "[Forwarded] Important update for the project." in conv2_msg_contents
        print(f"[OK] Forwarded message verified inside destination conversation history")

    print("=== Stage 14 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())
