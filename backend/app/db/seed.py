"""Seed data script pre-populating 5 realistic users with 10-digit phone numbers, direct chats, a group chat, and messages."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.models import (
    Contact,
    Conversation,
    ConversationMember,
    ConversationType,
    MemberRole,
    Message,
    MessageStatus,
    MessageStatusEnum,
    MessageType,
    User,
)


async def seed_database_if_empty(db: AsyncSession):
    """Seed DB with demo users, contacts, 1:1 and group conversations, and messages if DB is empty."""
    user_check = await db.execute(select(User))
    if user_check.scalars().first() is not None:
        print("[INFO] Database already contains data. Skipping seeding.")
        return

    print("[INFO] Database is empty. Seeding initial demo data...")
    now = datetime.now(timezone.utc)

    # 1. Create 5 realistic users with 10-digit phone numbers (is_online=False by default)
    alice = User(
        phone_number="+15550001001",
        username="alice_smith",
        display_name="Alice Smith",
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
        is_online=False,
        last_seen=now - timedelta(minutes=15),
    )
    bob = User(
        phone_number="+15550001002",
        username="bob_jones",
        display_name="Bob Jones",
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
        is_online=False,
        last_seen=now - timedelta(minutes=30),
    )
    charlie = User(
        phone_number="+15550001003",
        username="charlie_brown",
        display_name="Charlie Brown",
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
        is_online=False,
        last_seen=now - timedelta(hours=2),
    )
    diana = User(
        phone_number="+15550001004",
        username="diana_prince",
        display_name="Diana Prince",
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
        is_online=False,
        last_seen=now - timedelta(days=1),
    )
    edward = User(
        phone_number="+15550001005",
        username="edward_snow",
        display_name="Edward Snow",
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Edward",
        is_online=False,
        last_seen=now - timedelta(days=3),
    )

    db.add_all([alice, bob, charlie, diana, edward])
    await db.commit()
    for u in [alice, bob, charlie, diana, edward]:
        await db.refresh(u)

    # 2. Add mutual Contacts
    contacts = [
        Contact(user_id=alice.id, contact_user_id=bob.id, nickname="Bob"),
        Contact(user_id=alice.id, contact_user_id=charlie.id, nickname="Charlie"),
        Contact(user_id=bob.id, contact_user_id=alice.id, nickname="Alice"),
        Contact(user_id=bob.id, contact_user_id=charlie.id, nickname="Charlie"),
        Contact(user_id=charlie.id, contact_user_id=alice.id, nickname="Alice"),
    ]
    db.add_all(contacts)
    await db.commit()

    # 3. Create 2 Direct Conversations & 1 Group Conversation
    conv1 = Conversation(type=ConversationType.DIRECT, created_at=now - timedelta(hours=5), updated_at=now - timedelta(minutes=5))
    conv2 = Conversation(type=ConversationType.DIRECT, created_at=now - timedelta(hours=10), updated_at=now - timedelta(hours=1))
    group_conv = Conversation(
        type=ConversationType.GROUP,
        name="Signal Core Dev Team",
        avatar_url="https://api.dicebear.com/7.x/identicon/svg?seed=SignalDev",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(minutes=2),
    )

    db.add_all([conv1, conv2, group_conv])
    await db.commit()
    for c in [conv1, conv2, group_conv]:
        await db.refresh(c)

    # 4. Create Conversation Memberships
    mems = [
        ConversationMember(conversation_id=conv1.id, user_id=alice.id, role=MemberRole.MEMBER),
        ConversationMember(conversation_id=conv1.id, user_id=bob.id, role=MemberRole.MEMBER),
        ConversationMember(conversation_id=conv2.id, user_id=alice.id, role=MemberRole.MEMBER),
        ConversationMember(conversation_id=conv2.id, user_id=charlie.id, role=MemberRole.MEMBER),
        ConversationMember(conversation_id=group_conv.id, user_id=alice.id, role=MemberRole.ADMIN),
        ConversationMember(conversation_id=group_conv.id, user_id=bob.id, role=MemberRole.MEMBER),
        ConversationMember(conversation_id=group_conv.id, user_id=charlie.id, role=MemberRole.MEMBER),
        ConversationMember(conversation_id=group_conv.id, user_id=diana.id, role=MemberRole.MEMBER),
    ]
    db.add_all(mems)
    await db.commit()

    # 5. Create Realistic Messages & Receipts
    msg1 = Message(
        conversation_id=conv1.id,
        sender_id=alice.id,
        content="Hey Bob! Did you check out the Signal Clone specs?",
        created_at=now - timedelta(hours=3),
    )
    msg2 = Message(
        conversation_id=conv1.id,
        sender_id=bob.id,
        content="Yes! Next.js 14 + FastAPI + WebSockets look solid.",
        created_at=now - timedelta(hours=2),
    )
    msg3 = Message(
        conversation_id=conv1.id,
        sender_id=alice.id,
        content="Awesome. Let's make sure the UI matches Signal perfectly!",
        created_at=now - timedelta(minutes=5),
    )

    sys_grp_msg = Message(
        conversation_id=group_conv.id,
        sender_id=alice.id,
        content="Alice Smith created the group 'Signal Core Dev Team'",
        message_type=MessageType.SYSTEM,
        created_at=now - timedelta(days=2),
    )
    grp_msg1 = Message(
        conversation_id=group_conv.id,
        sender_id=alice.id,
        content="Welcome team! Let me know if the WebSocket sync is working.",
        created_at=now - timedelta(hours=4),
    )
    grp_msg2 = Message(
        conversation_id=group_conv.id,
        sender_id=bob.id,
        content="And I am wiring up the Next.js Zustand stores!",
        created_at=now - timedelta(minutes=2),
    )

    db.add_all([msg1, msg2, msg3, sys_grp_msg, grp_msg1, grp_msg2])
    await db.commit()
    for m in [msg1, msg2, msg3, sys_grp_msg, grp_msg1, grp_msg2]:
        await db.refresh(m)

    # Message Status Receipts
    statuses = [
        MessageStatus(message_id=msg1.id, user_id=bob.id, status=MessageStatusEnum.READ, updated_at=now - timedelta(hours=2, minutes=55)),
        MessageStatus(message_id=msg2.id, user_id=alice.id, status=MessageStatusEnum.READ, updated_at=now - timedelta(hours=1, minutes=50)),
        MessageStatus(message_id=msg3.id, user_id=bob.id, status=MessageStatusEnum.READ, updated_at=now - timedelta(minutes=1)),
        MessageStatus(message_id=grp_msg1.id, user_id=bob.id, status=MessageStatusEnum.READ, updated_at=now - timedelta(hours=3)),
        MessageStatus(message_id=grp_msg1.id, user_id=charlie.id, status=MessageStatusEnum.DELIVERED, updated_at=now - timedelta(hours=3)),
        MessageStatus(message_id=grp_msg2.id, user_id=alice.id, status=MessageStatusEnum.READ, updated_at=now - timedelta(minutes=1)),
    ]
    db.add_all(statuses)
    await db.commit()

    print("[INFO] Database successfully seeded with demo users, conversations, and messages.")
