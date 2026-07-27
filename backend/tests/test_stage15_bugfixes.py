"""Automated verification suite testing 1:1 chat deduplication, system pill persistence, clear history, and leave group."""

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
    print("=== Stage 15 Bugfixes Verification Starting ===")

    # 1. Reset & Seed DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    # 2. Use ASGI Transport to test FastAPI directly in-process
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=BASE_URL) as client:
        # Authenticate Alice (5550001001) & Bob (5550001002)
        res_a = await client.post("/auth/verify-otp", json={"identifier": "5550001001", "otp": "123456"})
        assert res_a.status_code == 200
        token_a = res_a.json()["access_token"]

        res_b = await client.post("/auth/verify-otp", json={"identifier": "5550001002", "otp": "123456"})
        assert res_b.status_code == 200
        token_b = res_b.json()["access_token"]
        bob_id = res_b.json()["user"]["id"]

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # A) Test 1:1 Chat Deduplication
        res_conv1 = await client.post("/conversations/direct", headers=headers_a, json={"recipient_id": bob_id})
        assert res_conv1.status_code == 200, f"Create conv1 failed: {res_conv1.text}"
        conv1_id = res_conv1.json()["id"]

        res_conv2 = await client.post("/conversations/direct", headers=headers_a, json={"recipient_id": bob_id})
        assert res_conv2.status_code == 200, f"Create conv2 failed: {res_conv2.text}"
        conv2_id = res_conv2.json()["id"]

        assert conv1_id == conv2_id, f"Duplicate direct chats created: {conv1_id} vs {conv2_id}"
        print(f"[OK] 1:1 Direct Chat Deduplication verified (Single Conv ID: {conv1_id})")

        # B) Test Disappearing System Pill Persistence
        res_timer = await client.patch(
            f"/conversations/{conv1_id}/disappearing-timer",
            headers=headers_a,
            json={"timer_seconds": 5}
        )
        assert res_timer.status_code == 200

        res_msgs = await client.get(f"/conversations/{conv1_id}/messages", headers=headers_a)
        sys_msgs = [m for m in res_msgs.json() if m["message_type"] == "system"]
        assert len(sys_msgs) > 0
        for sm in sys_msgs:
            assert sm["expires_at"] is None, "System message incorrectly set with expiring timestamp!"
        print(f"[OK] System Notification Pill Persistence verified (expires_at is None)")

        # C) Test Clear Chat History
        res_clear = await client.delete(f"/conversations/{conv1_id}/messages", headers=headers_a)
        assert res_clear.status_code == 200
        assert res_clear.json()["message"] == "Chat history cleared for you"
        print(f"[OK] Clear Chat History endpoint verified (User-scoped clear)")

        # D) Test Leave Group Flow for Bob in Group (Conv 3)
        res_leave = await client.delete(f"/groups/3/members/{bob_id}", headers=headers_b)
        assert res_leave.status_code == 200
        print(f"[OK] Leave Group endpoint verified for Bob")

    print("=== Stage 15 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())
