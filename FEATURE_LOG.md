# FEATURE_LOG.md

Living log. Add an entry every time a feature is started/finished, a bug is fixed, or a decision is made that deviates from `PROJECT_CONTEXT.md` / `ARCHITECTURE.md`. Newest entries at the top of each section.

## Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-26 | Backend = FastAPI (not Django) | Async-native for WebSockets, less boilerplate for a 24h build, auto OpenAPI docs help the API-design grading criterion |
| 2026-07-26 | Real-time = native FastAPI WebSockets (not Socket.IO) | Single web client, no need for transport fallback/cross-platform SDKs; free, one less moving part to deploy |
| 2026-07-26 | Deploy = Vercel (frontend) + Railway (backend + SQLite volume) | Both free tiers, straightforward CI, SQLite persists via Railway volume |

## Features — In Progress

| Feature | Status | Notes |
| --- | --- | --- |

## Features — Done

| Feature | Status | Notes |
| --- | --- | --- |
| Stage 1: Backend skeleton & DB Schema | Done | FastAPI app factory, async SQLAlchemy engine (`sqlite+aiosqlite`), Alembic config, 6 ORM models (`User`, `Contact`, `Conversation`, `ConversationMember`, `Message`, `MessageStatus`) created and verified |
| Stage 2: Auth flow (mocked OTP + JWT) | Done | Fixed-OTP registration, login, JWT token generation, auth middleware dependency, profile setup, user search, and contacts API created and verified |
| Stage 3: Seed data script | Done | Auto-seeding script populates 5 realistic users, 2 direct chats, 1 group chat ("Signal Core Dev Team"), and 9 messages with status receipts on startup |
| Stage 4: REST APIs (contacts, conversations, messages) | Done | Pydantic schemas, conversation list/search, 1:1 chat initialization, message send/fetch history, clear/delete chat endpoints, and message status receipts (`delivered`, `read`) created and verified |
| Stage 5: WebSocket layer | Done | ConnectionManager (`app/core/ws_manager.py`), `/ws/{token}` endpoint (`app/api/routes_ws.py`), real-time event dispatching (`message:new`, `message:status`, `typing`, `presence`) verified |
| Stage 6: Group messaging logic & admin controls | Done | Group creation (`app/services/group_service.py`), member management (add/remove), admin permission enforcement, group deletion, system message logging, and WebSocket fan-out verified |
| Stage 7: Frontend core UI (Signal Clone UX) | Done | Next.js 14+ App Router, Tailwind CSS design system matching Signal UI & Desktop navigation rail, Zustand stores (`useAuthStore`, `useChatStore`), `api-client.ts`, `ws-client.ts`, status check ticks, and group modals built and verified |
| Stage 8: Coming soon placeholders & encrypted badge | Done | Built placeholder screens for Voice/Video calls, Stories, Linked Devices, and simulated E2E encryption lock badges across chat header, message bubbles, and settings |
| Stage 9: Deployment config (Vercel/Railway) | Done | Configured Vercel config (`vercel.json`), Railway Dockerfile, `railway.json`, `Procfile`, and `.env.example` files for both frontend and backend |
| Stage 10: Documentation & README | Done | Comprehensive `README.md` containing setup instructions, tech stack, architecture diagram, 6-table DB schema details, API overview, and assumptions |

*(move rows here from "In Progress" as they're completed, with the date and a one-line note on anything notable about the implementation)*

## Bugs / Fixes

| Date | Bug | Fix | Notes |
| --- | --- | --- | --- |

## Bonus features (only if time remains, in priority order)
1. Message reactions (emoji)
2. Reply-to / quoted messages
3. Attachments (images/files)
4. Dark mode
5. Disappearing messages (functional)
6. Responsive design pass
7. Keyboard shortcuts

## Assumptions log

*(anything assumed rather than confirmed with the assignment giver — keep this honest, it's meant to be shown during the evaluation interview)*
