# ARCHITECTURE.md

## High-level shape

```
┌─────────────────────┐      HTTPS (REST)     ┌──────────────────────┐
│  Next.js Frontend   │ ────────────────────> │   FastAPI Backend    │
│      (Vercel)       │ <──────────────────── │      (Railway)       │
│                     │    WSS (WebSocket)    │                      │
└─────────────────────┘ ═════════════════════ └──────────┬───────────┘
                                                         │
                                                 SQLAlchemy (async)
                                                         │
                                                         ▼
                                               ┌──────────────────┐
                                               │  SQLite (file,   │
                                               │ Railway volume)  │
                                               └──────────────────┘
```

## Backend layers (FastAPI)

```
backend/
  app/
    main.py                   # app factory, CORS, router mounting, WS endpoint mount
    core/
      config.py               # settings (env vars), constants (fixed OTP, JWT secret)
      security.py             # JWT encode/decode, current-user dependency
      ws_manager.py           # ConnectionManager: tracks active WS connections per user
    db/
      base.py                 # SQLAlchemy base, async session factory
      models.py               # ORM models (see schema in PROJECT_CONTEXT/README)
      seed.py                 # seed script — run on startup if DB is empty
    schemas/                  # Pydantic request/response models, one file per domain
      auth.py
      user.py
      conversation.py
      message.py
    services/                 # business logic, framework-agnostic where possible
      auth_service.py
      conversation_service.py
      message_service.py
      group_service.py
    api/
      routes_auth.py          # /auth/register, /auth/verify-otp, /auth/login
      routes_users.py         # /users/me, /users/search, /contacts
      routes_conversations.py
      routes_groups.py
      routes_ws.py            # /ws/{token} — upgrades to WebSocket
  alembic/                    # migrations
  tests/
  requirements.txt
```

**Layering rule**: `api/*` (routes) only parse input, call a `services/*` function, and shape the response. All persistence and business logic lives in `services/*`, which talks to the DB through `db/models.py` via injected async sessions. Routes never touch the DB session directly beyond passing it through — this is what makes "code understanding" and modularity easy to defend in the evaluation interview.

## Real-time design
- Single WebSocket endpoint per authenticated user: `/ws/{token}`.
- `ws_manager.py` holds an in-memory `dict[user_id, set[WebSocket]]` (a user can have multiple tabs/devices open).
- On message send: REST call persists the message (source of truth), then the same request handler pushes the new message payload over WebSocket to every connected member of that conversation. REST is authoritative; WebSocket is the delivery mechanism — if a client is offline, it just fetches on next load, no message is lost.
- Typing indicators and read/delivered receipts are WebSocket-only events (ephemeral, not persisted as their own DB rows — read/delivered state is persisted on the message row, but the live "X is typing" ping is transient).

## Frontend structure (Next.js App Router)

```
frontend/
  app/
    (auth)/
      register/page.tsx
      verify-otp/page.tsx
      profile-setup/page.tsx
    (main)/
      layout.tsx              # conversation list + chat pane shell
      page.tsx                # empty-state / default chat pane
      chat/[conversationId]/page.tsx
      settings/page.tsx
  components/
    conversation-list/
    chat-pane/
    message-bubble/
    group/
    ui/                       # buttons, modals, inputs — shared primitives
  lib/
    api-client.ts             # typed fetch wrapper for REST
    ws-client.ts              # WebSocket connection + event dispatch
    store/                    # zustand stores: auth, conversations, messages, presence
    types.ts                  # shared TS types mirroring backend Pydantic schemas
```

**State flow**: REST fetch hydrates initial state into the store on load -> `ws-client.ts` subscribes once and dispatches incoming events (`message:new`, `message:status`, `typing`, `presence`) into the same store -> components are pure consumers of store state, never touch WebSocket or fetch directly.

## Data flow summary (send message, 1:1)
1. User types in `chat-pane` -> `POST /conversations/{id}/messages`
2. `routes_conversations.py` -> `message_service.send_message()` -> persists row, `status = sent`
3. Handler pushes `{type: "message:new", ...}` over WS to the recipient's connections
4. Recipient's client receives it, store updates, UI shows the new bubble, and fires `PATCH /messages/{id}/delivered` (or a WS ack) once rendered
5. When recipient opens the conversation, client fires `.../read`, which persists `read_at` and pushes a `message:status` event back to the sender to flip the tick to blue

## Deployment topology
- **Frontend**: Vercel, env var `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` pointing at the Railway backend
- **Backend**: Railway, SQLite file on a mounted volume so it survives redeploys; CORS restricted to the Vercel domain
