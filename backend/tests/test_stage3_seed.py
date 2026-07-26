"""Stage 3 verification script: Test automated seed script execution and database population."""

import asyncio
import os
import sys
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.base import AsyncSessionLocal, engine, Base
from app.db.models import User, Conversation, Message, Contact, ConversationType
from app.db.seed import seed_database_if_empty


async def run_stage3_verification():
    """Execute verification of seed database script."""
    print("=== Stage 3 Verification Starting ===")

    # 1. Reset database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # 2. Run seed script
    async with AsyncSessionLocal() as session:
        await seed_database_if_empty(session)

    # 3. Verify users seeded
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User))
        users = user_res.scalars().all()
        assert len(users) == 5, f"Expected 5 users, got {len(users)}"
        usernames = {u.username for u in users}
        assert usernames == {"alice", "bob", "charlie", "diana", "edward"}
        print(f"[OK] Seeded {len(users)} users: {sorted(list(usernames))}")

        # 4. Verify conversations seeded
        conv_res = await session.execute(
            select(Conversation).options(
                selectinload(Conversation.members),
                selectinload(Conversation.messages),
            )
        )
        conversations = conv_res.scalars().all()
        assert len(conversations) == 3, f"Expected 3 conversations, got {len(conversations)}"

        group_conv = next(c for c in conversations if c.type == ConversationType.GROUP)
        assert group_conv.name == "Signal Core Dev Team"
        assert len(group_conv.members) == 4
        print(f"[OK] Seeded Group '{group_conv.name}' with {len(group_conv.members)} members")

        # 5. Verify total message count
        msg_count_res = await session.execute(select(func.count(Message.id)))
        total_messages = msg_count_res.scalar_one()
        assert total_messages >= 9, f"Expected at least 9 messages, got {total_messages}"
        print(f"[OK] Seeded total of {total_messages} messages across all conversations")

        # 6. Verify seed script idempotency (running on non-empty DB)
        await seed_database_if_empty(session)
        user_res_after = await session.execute(select(User))
        assert len(user_res_after.scalars().all()) == 5
        print("[OK] Seed script is idempotent (skipped duplicate seeding on non-empty DB)")

    print("=== Stage 3 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(run_stage3_verification())
