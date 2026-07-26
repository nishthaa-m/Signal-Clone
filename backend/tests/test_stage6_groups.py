"""Stage 6 verification script: Test group creation, admin permissions, member management, and system messages."""

import asyncio
import os
import sys
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.base import AsyncSessionLocal, engine, Base
from app.db.seed import seed_database_if_empty


async def run_stage6_verification():
    """Execute complete end-to-end verification of Stage 6 Group Messaging capabilities."""
    print("=== Stage 6 Verification Starting ===")

    # Reset and seed database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Obtain tokens for Alice (ID: 1) and Charlie (ID: 3)
        res_alice = await client.post("/auth/verify-otp", json={"phone_number": "+15550001", "otp": "123456"})
        alice_token = res_alice.json()["access_token"]
        headers_alice = {"Authorization": f"Bearer {alice_token}"}

        res_charlie = await client.post("/auth/verify-otp", json={"phone_number": "+15550003", "otp": "123456"})
        charlie_token = res_charlie.json()["access_token"]
        headers_charlie = {"Authorization": f"Bearer {charlie_token}"}

        # 1. Create Group "Frontend Engineers" by Alice with Bob (ID: 2)
        create_res = await client.post(
            "/groups",
            json={
                "name": "Frontend Engineers",
                "member_ids": [2],
            },
            headers=headers_alice,
        )
        assert create_res.status_code == 200, create_res.text
        group_data = create_res.json()
        group_id = group_data["id"]
        assert group_data["name"] == "Frontend Engineers"
        assert len(group_data["members"]) == 2
        print(f"[OK] Created group 'Frontend Engineers' (ID: {group_id}) with Alice as Admin")

        # 2. Non-admin (Charlie) attempts to add member to group -> 403 Forbidden
        forbidden_add = await client.post(
            f"/groups/{group_id}/members",
            json={"user_ids": [4]},
            headers=headers_charlie,
        )
        assert forbidden_add.status_code == 403
        print("[OK] Non-admin member addition correctly rejected with HTTP 403 Forbidden")

        # 3. Admin (Alice) adds Charlie (ID: 3) to group
        add_res = await client.post(
            f"/groups/{group_id}/members",
            json={"user_ids": [3]},
            headers=headers_alice,
        )
        assert add_res.status_code == 200, add_res.text
        updated_group = add_res.json()
        assert len(updated_group["members"]) == 3
        print("[OK] Admin successfully added Charlie to the group")

        # 4. Admin (Alice) removes Bob (ID: 2) from group
        remove_res = await client.delete(
            f"/groups/{group_id}/members/2",
            headers=headers_alice,
        )
        assert remove_res.status_code == 200, remove_res.text
        group_after_remove = remove_res.json()
        remaining_uids = [m["user_id"] for m in group_after_remove["members"]]
        assert 2 not in remaining_uids
        print("[OK] Admin successfully removed Bob from the group")

        # 5. Fetch message history for group -> verify system messages
        msgs_res = await client.get(f"/conversations/{group_id}/messages", headers=headers_alice)
        assert msgs_res.status_code == 200
        msgs = msgs_res.json()
        system_msgs = [m for m in msgs if m["message_type"] == "system"]
        assert len(system_msgs) >= 3
        print(f"[OK] Group message history contains {len(system_msgs)} system event logs")

        # 6. Post regular group text message from Alice
        msg_post = await client.post(
            f"/conversations/{group_id}/messages",
            json={"content": "Welcome to the group Charlie!"},
            headers=headers_alice,
        )
        assert msg_post.status_code == 200
        assert msg_post.json()["content"] == "Welcome to the group Charlie!"
        print("[OK] Successfully posted text message to group conversation")

    print("=== Stage 6 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(run_stage6_verification())
