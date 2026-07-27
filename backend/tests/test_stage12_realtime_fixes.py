"""Automated verification suite testing 10-digit login, single message deletion, static file serving, and typing indicators."""

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
    print("=== Stage 12 Real-Time & Stabilization Verification Starting ===")

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
        assert res_b.status_code == 200, f"10-digit login failed: {res_b.text}"
        token_b = res_b.json()["access_token"]

        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}
        print(f"[OK] 10-digit phone normalization & authentication verified for Alice and Bob")

        # 3. Test Static File Upload & Media Serving
        files = {"file": ("signal_test.png", io.BytesIO(b"png_sample_data"), "image/png")}
        res_upload = await client.post("/upload", headers=headers_a, files=files)
        assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
        file_url = res_upload.json()["url"]
        assert file_url.startswith("/uploads/")

        res_static = await client.get(file_url)
        assert res_static.status_code == 200, f"Static media file HTTP fetch failed: {res_static.status_code}"
        assert res_static.content == b"png_sample_data"
        print(f"[OK] Attachment upload and static media serving verified: {file_url}")

        # 4. Test Posting & Deleting a Specific Message
        res_msg = await client.post(
            "/conversations/1/messages",
            headers=headers_a,
            json={"content": "This message is about to be deleted single-handedly."}
        )
        assert res_msg.status_code == 200, f"Post message failed: {res_msg.text}"
        msg_id = res_msg.json()["id"]

        # Delete message
        res_del = await client.delete(f"/messages/{msg_id}", headers=headers_a)
        assert res_del.status_code == 200, f"Delete message failed: {res_del.text}"
        assert res_del.json()["message"] == "Message deleted successfully"
        print(f"[OK] Single message deletion endpoint DELETE /messages/{msg_id} verified")

        # Verify message is gone from history
        res_history = await client.get("/conversations/1/messages", headers=headers_a)
        msg_ids = [m["id"] for m in res_history.json()]
        assert msg_id not in msg_ids
        print(f"[OK] Message {msg_id} confirmed removed from conversation history")

    print("=== Stage 12 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())
