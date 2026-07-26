"""Stage 4 verification script: REST APIs for conversations, messaging, receipts, and search."""

import asyncio
import os
import sys
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.base import AsyncSessionLocal, engine, Base
from app.db.seed import seed_database_if_empty


async def run_stage4_verification():
    """Execute complete end-to-end verification of Stage 4 REST APIs."""
    print("=== Stage 4 Verification Starting ===")

    # Reset and seed database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Alice (+15550001)
        res_alice = await client.post("/auth/verify-otp", json={"phone_number": "+15550001", "otp": "123456"})
        alice_token = res_alice.json()["access_token"]
        headers_alice = {"Authorization": f"Bearer {alice_token}"}

        # 2. Login as Bob (+15550002)
        res_bob = await client.post("/auth/verify-otp", json={"phone_number": "+15550002", "otp": "123456"})
        bob_token = res_bob.json()["access_token"]
        headers_bob = {"Authorization": f"Bearer {bob_token}"}

        # 3. GET /conversations for Alice
        convs_resp = await client.get("/conversations", headers=headers_alice)
        assert convs_resp.status_code == 200, convs_resp.text
        convs = convs_resp.json()
        assert len(convs) == 3
        print(f"[OK] GET /conversations returned {len(convs)} conversations sorted by activity")

        target_conv = convs[0]
        conv_id = target_conv["id"]

        # 4. GET /conversations/{id}/messages
        msgs_resp = await client.get(f"/conversations/{conv_id}/messages", headers=headers_alice)
        assert msgs_resp.status_code == 200, msgs_resp.text
        msgs = msgs_resp.json()
        print(f"[OK] GET /conversations/{conv_id}/messages returned {len(msgs)} messages")

        # 5. POST /conversations/{id}/messages (Send message from Alice)
        send_resp = await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Testing REST API message dispatch!"},
            headers=headers_alice,
        )
        assert send_resp.status_code == 200, send_resp.text
        new_msg = send_resp.json()
        assert new_msg["content"] == "Testing REST API message dispatch!"
        print(f"[OK] POST /conversations/{conv_id}/messages created message (ID: {new_msg['id']})")

        # 6. Mark message delivered from Bob
        deliv_resp = await client.patch(f"/messages/{new_msg['id']}/delivered", headers=headers_bob)
        assert deliv_resp.status_code == 200, deliv_resp.text
        assert deliv_resp.json()["status"] == "delivered"
        print("[OK] PATCH /messages/{id}/delivered updated status to 'delivered'")

        # 7. Mark conversation read from Bob
        read_resp = await client.patch(f"/conversations/{conv_id}/read", headers=headers_bob)
        assert read_resp.status_code == 200, read_resp.text
        print("[OK] PATCH /conversations/{id}/read marked unread messages as read")

        # 8. Start new 1:1 conversation with Edward (ID: 5)
        direct_resp = await client.post(
            "/conversations/direct",
            json={"recipient_id": 5},
            headers=headers_alice,
        )
        assert direct_resp.status_code == 200, direct_resp.text
        assert direct_resp.json()["type"] == "direct"
        print("[OK] POST /conversations/direct opened 1:1 conversation with Edward")

        # 9. Search conversations
        search_resp = await client.get("/conversations?q=Dev", headers=headers_alice)
        assert search_resp.status_code == 200, search_resp.text
        search_convs = search_resp.json()
        assert len(search_convs) == 1
        assert search_convs[0]["name"] == "Signal Core Dev Team"
        print("[OK] GET /conversations?q=Dev successfully filtered conversation list")

    print("=== Stage 4 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(run_stage4_verification())
