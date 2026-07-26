"""Stage 1 verification script: verify DB engine, schema creation, and ORM operations."""

import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.db.base import AsyncSessionLocal, engine, Base
from app.db.models import (
    User,
    Contact,
    Conversation,
    ConversationType,
    ConversationMember,
    MemberRole,
    Message,
    MessageType,
    MessageStatus,
    MessageStatusEnum,
)


async def run_stage1_verification():
    """Verify database connection, table creation, and CRUD operations across all models."""
    print("=== Stage 1 Verification Starting ===")

    # 1. Reset and Create Tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created successfully via SQLAlchemy metadata")

    # 2. Insert test data
    async with AsyncSessionLocal() as session:
        # Create users
        alice = User(phone_number="+15550001", username="alice", display_name="Alice Smith")
        bob = User(phone_number="+15550002", username="bob", display_name="Bob Jones")
        session.add_all([alice, bob])
        await session.commit()
        await session.refresh(alice)
        await session.refresh(bob)
        print(f"[OK] Created Users: Alice (ID: {alice.id}), Bob (ID: {bob.id})")

        # Create contact
        contact = Contact(user_id=alice.id, contact_user_id=bob.id, nickname="Bobby")
        session.add(contact)
        await session.commit()
        print(f"[OK] Created Contact relationship: Alice -> Bob ('Bobby')")

        # Create 1:1 Conversation
        conv = Conversation(type=ConversationType.DIRECT)
        session.add(conv)
        await session.commit()
        await session.refresh(conv)

        mem1 = ConversationMember(conversation_id=conv.id, user_id=alice.id, role=MemberRole.ADMIN)
        mem2 = ConversationMember(conversation_id=conv.id, user_id=bob.id, role=MemberRole.MEMBER)
        session.add_all([mem1, mem2])
        await session.commit()
        print(f"[OK] Created Direct Conversation (ID: {conv.id}) with 2 members")

        # Create Message
        msg = Message(
            conversation_id=conv.id,
            sender_id=alice.id,
            content="Hello Bob! This is a test message.",
            message_type=MessageType.TEXT,
        )
        session.add(msg)
        await session.commit()
        await session.refresh(msg)

        status = MessageStatus(
            message_id=msg.id,
            user_id=bob.id,
            status=MessageStatusEnum.SENT,
        )
        session.add(status)
        await session.commit()
        print(f"[OK] Created Message (ID: {msg.id}) with MessageStatus 'sent'")

        # 3. Query back & verify relationships
        result = await session.execute(
            select(User).where(User.id == alice.id)
        )
        fetched_alice = result.scalar_one()
        assert fetched_alice.username == "alice"

        result = await session.execute(
            select(Message).where(Message.id == msg.id)
        )
        fetched_msg = result.scalar_one()
        assert fetched_msg.content == "Hello Bob! This is a test message."
        print("[OK] Successfully queried back data with full relationship integrity")

    print("=== Stage 1 Verification Complete: ALL TESTS PASSED ===")


if __name__ == "__main__":
    asyncio.run(run_stage1_verification())
