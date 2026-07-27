"""Automated verification suite testing Attachments, Reactions, Quoted Replies, and Disappearing Messages."""

import asyncio
import io
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
    print("=== Stage 11 Advanced Features Verification Starting ===")

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
        assert res_a.status_code == 200, f"Auth failed: {res_a.text}"
        token_a = res_a.json()["access_token"]

        res_b = await client.post("/auth/verify-otp", json={"identifier": "5550001002", "otp": "123456"})
        assert res_b.status_code == 200, f"Auth failed: {res_b.text}"
        token_b = res_b.json()["access_token"]

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. Test File Upload Endpoint
        files = {"file": ("test_attachment.png", io.BytesIO(b"fake_image_bytes"), "image/png")}
        res_upload = await client.post("/upload", headers=headers_a, files=files)
        assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
        upload_data = res_upload.json()
        assert "url" in upload_data
        assert upload_data["attachment_type"] == "image"
        print(f"[OK] File attachment upload endpoint verified: {upload_data['url']}")

        # 4. Test Sending Message with Image Attachment & Reply-to
        res_msg1 = await client.post(
            "/conversations/1/messages",
            headers=headers_a,
            json={"content": "Check out this screenshot!", "attachment_url": upload_data["url"], "attachment_type": "image"}
        )
        assert res_msg1.status_code == 200, f"Send msg1 failed: {res_msg1.text}"
        msg1 = res_msg1.json()
        assert msg1["attachment_url"] == upload_data["url"]
        print(f"[OK] Image attachment message posted (ID: {msg1['id']})")

        # Reply to msg1
        res_msg2 = await client.post(
            "/conversations/1/messages",
            headers=headers_b,
            json={"content": "Looks awesome! Thanks for sharing.", "reply_to_id": msg1["id"]}
        )
        assert res_msg2.status_code == 200, f"Send msg2 failed: {res_msg2.text}"
        msg2 = res_msg2.json()
        assert msg2["reply_to_id"] == msg1["id"]
        assert msg2["reply_to"]["content"] == "Check out this screenshot!"
        print(f"[OK] Quoted reply-to message verified (Reply ID: {msg2['id']} -> Quoted ID: {msg1['id']})")

        # 5. Test Emoji Reaction Toggle
        res_react = await client.post(
            f"/messages/{msg1['id']}/reactions",
            headers=headers_b,
            json={"emoji": "❤️"}
        )
        assert res_react.status_code == 200, f"Reaction failed: {res_react.text}"
        reacts = res_react.json()
        assert len(reacts) == 1
        assert reacts[0]["emoji"] == "❤️"
        print(f"[OK] Emoji reaction toggle verified on message {msg1['id']}")

        # 6. Test Disappearing Message Timer & Expiration
        res_timer = await client.patch(
            "/conversations/1/disappearing-timer",
            headers=headers_a,
            json={"timer_seconds": 2}
        )
        assert res_timer.status_code == 200, f"Timer failed: {res_timer.text}"
        assert res_timer.json()["disappearing_timer"] == 2
        print(f"[OK] Disappearing message timer set to 2 seconds")

        # Post expiring message
        res_exp_msg = await client.post(
            "/conversations/1/messages",
            headers=headers_a,
            json={"content": "This message will self-destruct in 2 seconds!"}
        )
        assert res_exp_msg.status_code == 200, f"Expiring msg failed: {res_exp_msg.text}"
        exp_msg = res_exp_msg.json()
        assert exp_msg["expires_at"] is not None
        print(f"[OK] Expiring message created with expires_at timestamp")

        # Verify message exists initially
        res_msgs_before = await client.get("/conversations/1/messages", headers=headers_b)
        msg_ids_before = [m["id"] for m in res_msgs_before.json()]
        assert exp_msg["id"] in msg_ids_before

        # Wait 2.5 seconds for message to expire
        await asyncio.sleep(2.5)

        # Verify message is filtered out after expiration
        res_msgs_after = await client.get("/conversations/1/messages", headers=headers_b)
        msg_ids_after = [m["id"] for m in res_msgs_after.json()]
        assert exp_msg["id"] not in msg_ids_after
        print(f"[OK] Disappearing message expired and auto-filtered out successfully after 2 seconds!")

    print("=== Stage 11 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())
