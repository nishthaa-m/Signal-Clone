"""Automated verification suite testing 10-digit phone & username authentication."""

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
    print("=== Stage 13 Auth Redesign Verification Starting ===")

    # 1. Reset & Seed DB
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    # 2. Use ASGI Transport to test FastAPI directly in-process
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=BASE_URL) as client:
        # A) Test 10-Digit Phone Login for Alice (5550001001)
        res_otp_phone = await client.post("/auth/register", json={"identifier": "5550001001"})
        assert res_otp_phone.status_code == 200, f"Request OTP by phone failed: {res_otp_phone.text}"
        assert res_otp_phone.json()["otp"] == "123456"

        res_verify_phone = await client.post("/auth/verify-otp", json={"identifier": "5550001001", "otp": "123456"})
        assert res_verify_phone.status_code == 200, f"Verify OTP by phone failed: {res_verify_phone.text}"
        data_phone = res_verify_phone.json()
        assert "access_token" in data_phone
        assert data_phone["user"]["display_name"] == "Alice Smith"
        print(f"[OK] 10-digit phone number login verified for Alice (5550001001)")

        # B) Test Username Login for Bob (bob_jones)
        res_otp_user = await client.post("/auth/register", json={"identifier": "bob_jones"})
        assert res_otp_user.status_code == 200, f"Request OTP by username failed: {res_otp_user.text}"

        res_verify_user = await client.post("/auth/verify-otp", json={"identifier": "bob_jones", "otp": "123456"})
        assert res_verify_user.status_code == 200, f"Verify OTP by username failed: {res_verify_user.text}"
        data_user = res_verify_user.json()
        assert "access_token" in data_user
        assert data_user["user"]["display_name"] == "Bob Jones"
        print(f"[OK] Username login verified for Bob (bob_jones)")

        # C) Test Registration for New 10-Digit User
        res_verify_new = await client.post("/auth/verify-otp", json={"identifier": "5559998888", "otp": "123456"})
        assert res_verify_new.status_code == 200
        data_new = res_verify_new.json()
        assert data_new["user"]["phone_number"] == "+15559998888"
        print(f"[OK] New user registration verified for 5559998888")

    print("=== Stage 13 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(main())
