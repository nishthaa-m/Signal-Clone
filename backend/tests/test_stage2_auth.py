"""Stage 2 verification script: Auth endpoints, JWT issuance, profile setup, and contacts."""

import asyncio
import os
import sys
import httpx

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.db.base import engine, Base


async def run_stage2_verification():
    """Execute complete end-to-end verification of Stage 2 Auth & Contacts API endpoints."""
    print("=== Stage 2 Verification Starting ===")

    # Reset DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User 1 (Alice)
        reg_resp = await client.post("/auth/register", json={"phone_number": "+15551000"})
        assert reg_resp.status_code == 200, reg_resp.text
        assert reg_resp.json()["otp"] == "123456"
        print("[OK] /auth/register returned fixed OTP 123456")

        # 2. Verify OTP User 1
        verify_resp = await client.post(
            "/auth/verify-otp",
            json={"phone_number": "+15551000", "otp": "123456"},
        )
        assert verify_resp.status_code == 200, verify_resp.text
        token_data = verify_resp.json()
        alice_token = token_data["access_token"]
        alice_id = token_data["user"]["id"]
        print(f"[OK] /auth/verify-otp issued JWT token for Alice (ID: {alice_id})")

        # 3. Get /users/me
        headers_alice = {"Authorization": f"Bearer {alice_token}"}
        me_resp = await client.get("/users/me", headers=headers_alice)
        assert me_resp.status_code == 200, me_resp.text
        assert me_resp.json()["phone_number"] == "+15551000"
        print("[OK] /users/me authenticated profile fetch successful")

        # 4. Complete profile setup for Alice
        setup_resp = await client.post(
            "/auth/profile-setup",
            json={
                "display_name": "Alice Wonderland",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
            },
            headers=headers_alice,
        )
        assert setup_resp.status_code == 200, setup_resp.text
        assert setup_resp.json()["display_name"] == "Alice Wonderland"
        print("[OK] /auth/profile-setup updated display name and avatar URL")

        # 5. Register & Verify User 2 (Bob)
        await client.post("/auth/register", json={"phone_number": "+15552000"})
        bob_verify = await client.post(
            "/auth/verify-otp",
            json={"phone_number": "+15552000", "otp": "123456"},
        )
        bob_token = bob_verify.json()["access_token"]
        headers_bob = {"Authorization": f"Bearer {bob_token}"}
        await client.post(
            "/auth/profile-setup",
            json={"display_name": "Bob Builder"},
            headers=headers_bob,
        )
        print("[OK] User 2 (Bob Builder) registered and profile set up")

        # 6. Add Bob to Alice's contacts
        add_contact_resp = await client.post(
            "/contacts",
            json={"phone_or_username": "+15552000", "nickname": "Bobby"},
            headers=headers_alice,
        )
        assert add_contact_resp.status_code == 200, add_contact_resp.text
        assert add_contact_resp.json()["nickname"] == "Bobby"
        print("[OK] /contacts POST added Bob to Alice's contact list")

        # 7. List Alice's contacts
        list_contacts_resp = await client.get("/contacts", headers=headers_alice)
        assert list_contacts_resp.status_code == 200
        contacts = list_contacts_resp.json()
        assert len(contacts) == 1
        assert contacts[0]["contact_user"]["display_name"] == "Bob Builder"
        print("[OK] /contacts GET returned Alice's contact list with Bob")

        # 8. Search users
        search_resp = await client.get("/users/search?q=Builder", headers=headers_alice)
        assert search_resp.status_code == 200
        results = search_resp.json()
        assert len(results) == 1
        assert results[0]["display_name"] == "Bob Builder"
        print("[OK] /users/search query successfully matched 'Bob Builder'")

    print("=== Stage 2 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(run_stage2_verification())
