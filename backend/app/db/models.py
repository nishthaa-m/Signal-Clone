"""SQLAlchemy ORM models for Signal Clone database schema."""

from datetime import datetime, timezone
import enum
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    """Return current UTC timestamp without timezone offset for database storage."""
    return datetime.now(timezone.utc)


class ConversationType(str, enum.Enum):
    """Types of conversation: 1:1 direct chat or multi-user group chat."""
    DIRECT = "direct"
    GROUP = "group"


class MemberRole(str, enum.Enum):
    """Role of a user within a group conversation."""
    MEMBER = "member"
    ADMIN = "admin"


class MessageType(str, enum.Enum):
    """Type of message content: text message or system notification."""
    TEXT = "text"
    SYSTEM = "system"


class MessageStatusEnum(str, enum.Enum):
    """Lifecycle status of a message for a given recipient."""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class User(Base):
    """User account model holding profile and presence information."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    phone_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    contacts: Mapped[List["Contact"]] = relationship(
        "Contact",
        foreign_keys="[Contact.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    memberships: Mapped[List["ConversationMember"]] = relationship(
        "ConversationMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sent_messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="sender",
    )


class Contact(Base):
    """Contact relationship linking a user to another user as a saved contact."""
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nickname: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Constraints & Relationships
    __table_args__ = (
        UniqueConstraint("user_id", "contact_user_id", name="uq_user_contact"),
    )

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user: Mapped["User"] = relationship("User", foreign_keys=[contact_user_id])


class Conversation(Base):
    """Conversation entity representing direct 1:1 chats or group chats."""
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[ConversationType] = mapped_column(SQLEnum(ConversationType), default=ConversationType.DIRECT, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    members: Mapped[List["ConversationMember"]] = relationship(
        "ConversationMember",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class ConversationMember(Base):
    """Association table connecting users to conversations with member roles."""
    __tablename__ = "conversation_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[MemberRole] = mapped_column(SQLEnum(MemberRole), default=MemberRole.MEMBER, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),
    )

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")


class Message(Base):
    """Message entity representing a single message sent within a conversation."""
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(SQLEnum(MessageType), default=MessageType.TEXT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    sender: Mapped["User"] = relationship("User", back_populates="sent_messages")
    statuses: Mapped[List["MessageStatus"]] = relationship(
        "MessageStatus",
        back_populates="message",
        cascade="all, delete-orphan",
    )


class MessageStatus(Base):
    """Status record tracking delivery and read state per recipient for each message."""
    __tablename__ = "message_statuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    message_id: Mapped[int] = mapped_column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[MessageStatusEnum] = mapped_column(SQLEnum(MessageStatusEnum), default=MessageStatusEnum.SENT, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_status"),
    )

    message: Mapped["Message"] = relationship("Message", back_populates="statuses")
    user: Mapped["User"] = relationship("User")
