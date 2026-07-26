# PROJECT_CONTEXT.md

## What this is
A functional clone of Signal Messenger, built as an SDE Fullstack take-home assignment.
Goal: recreate Signal's UX and core messaging workflows (not real E2E cryptography — encryption is mocked/simulated). Evaluated on functionality, UI/UX fidelity, DB design, API design, code quality/modularity, and the candidate's ability to explain the code.

## Stack (decided)
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python) — chosen over Django because: async-native (fits WebSockets + concurrent chat connections naturally), far less boilerplate for a ~24-hour build, built-in Pydantic validation + auto-generated OpenAPI docs (helps the "clean API design" evaluation criterion), and it pairs well with SQLAlchemy for a hand-designed schema (the assignment wants the schema itself evaluated).
- **Database**: SQLite, accessed via SQLAlchemy (async engine) + Alembic for migrations
- **Real-time**: Native FastAPI/Starlette WebSockets — no Socket.IO. Reasoning: this assignment is one client type (a single Next.js web app), not multiple client platforms, so Socket.IO's main advantages (transport fallback, cross-platform SDKs) add cost without benefit. Native WebSockets are free, need no extra service, deploy as part of the same FastAPI app on Railway, and are simpler to explain in the evaluation interview.
- **Auth**: Mocked OTP (fixed code, e.g. `123456`) + JWT session tokens
- **Deployment**: Frontend -> Vercel (free tier). Backend + SQLite -> Railway (free tier, persistent volume for the SQLite file). Both free.
- **Repo shape**: single public GitHub repo, `frontend/` and `backend/` at the root

## Core user flows
1. **Onboarding**: enter phone/username -> mocked OTP screen -> enter fixed OTP -> set display name + avatar -> land on conversation list (empty or seeded).
2. **Conversation list**: left pane, sorted by most recent activity, shows avatar, name, last message preview, unread badge, online/last-seen dot. Search filters by contact/conversation name.
3. **1:1 chat**: open a conversation -> message thread loads (persisted history) -> type -> send -> optimistic "sending" tick -> WebSocket delivery to recipient -> "delivered" tick -> recipient views -> "read" tick (double blue check). Typing indicator fires on keystroke, clears after a short idle timeout.
4. **Group chat**: create group (name + pick members from contacts) -> same message pipeline, fanned out over WebSocket to all online members -> member list + admin controls (add/remove) gated to the group's admin(s).
5. **Contacts**: add a contact by phone/username -> appears in contact list and is eligible for new 1:1/group conversations.
6. **Settings**: placeholder screens for privacy, notifications, appearance ("Coming soon" is enough per spec) — plus a real dark-mode toggle if time permits (bonus item).

## Non-goals / explicitly mocked (per assignment spec)
- Real E2E encryption — simulate only (e.g. a lock icon + "encrypted" label, no real crypto is required to satisfy the assignment)
- Real phone/SMS verification — fixed OTP (`123456`)
- Voice/video calls, Stories, linked devices — "Coming soon" placeholders only

## Seed data requirement
Database must be seeded on first run with multiple users, a few 1:1 conversations, at least one group conversation, and enough message history that the app looks "lived-in" the moment it's opened — this is graded, not optional polish.

## Key dependencies (initial)
- **Frontend**: next, react, typescript, tailwindcss, zustand or React Context (chat state), date-fns (timestamps), lucide-react (icons)
- **Backend**: fastapi, uvicorn, sqlalchemy (async), aiosqlite, alembic, pydantic, python-jose or pyjwt (session tokens), passlib, websockets
