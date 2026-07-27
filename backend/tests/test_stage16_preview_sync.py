"""Automated verification suite testing live sidebar preview synchronization and disappearing message purge sync."""

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
    print("=== Stage 16 Preview & Disappearing Sync Verification Starting ===")

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
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # A) Set Disappearing Timer to 2s
        res_timer = await client.patch(
            "/conversations/1/disappearing-timer",
            headers=headers_a,
            json={"timer_seconds": 2}
        )
        assert res_timer.status_code == 200
        conv_timer_data = res_timer.json()
        assert conv_timer_data["last_message"] is not None
        assert "disappearing message timer" in conv_timer_data["last_message"]["content"]
        print(f"[OK] Disappearing timer update generated system message in last_message preview")

        # B) Post a 2-second expiring message
        res_exp = await client.post(
            "/conversations/1/messages",
            headers=headers_a,
            json={"content": "This text will expire in 2 seconds!"}
        )
        assert res_exp.status_code == 200
        exp_id = res_exp.json()["id"]

        # Verify preview initially shows the expiring message
        res_convs_before = await client.get("/conversations", headers=headers_a)
        conv1_before = next(c for c in res_convs_before.json() if c["id"] == 1)
        assert conv1_before["last_message"]["id"] == exp_id
        print(f"[OK] Sidebar preview initially shows expiring message (ID: {exp_id})")

        # Wait 2.5 seconds for expiration
        await asyncio.sleep(2.5)

        # Verify preview after expiration auto-purges the expired message and falls back to previous non-expired message!
        res_convs_after = await client.get("/conversations", headers=headers_a)
        conv1_after = next(c for c in res_convs_after.json() if c["id"] == 1)
        assert conv1_after["last_message"]["id"] != exp_id, "Expired message still returned in last_message preview!"
        print(f"[OK] Sidebar preview successfully purged expired message (Now showing ID: {conv1_after['last_message']['id']})")

    print("=== Stage 16 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())
