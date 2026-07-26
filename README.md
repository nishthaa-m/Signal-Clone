# Signal Messenger Clone — SDE Fullstack Take-Home Project

A functional, pixel-perfect clone of **Signal Messenger**, built as an SDE Fullstack take-home assignment. Recreates Signal Desktop & Mobile UX patterns, 1:1 messaging, group chats with admin controls, real-time WebSocket delivery, status receipts, typing indicators, presence, and mocked end-to-end encryption indicators.

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Zustand (state management), Lucide React (icons), Date-fns.
- **Backend**: FastAPI (Python), Async SQLAlchemy 2.0 (`sqlite+aiosqlite`), Alembic (migrations), Pydantic v2.
- **Real-Time**: Native FastAPI/Starlette WebSockets (single `/ws/{token}` connection manager per authenticated user).
- **Database**: SQLite accessed via async engine.
- **Auth**: Mocked fixed-code OTP (`123456`) + signed JWT session tokens.
- **Deployment**: Vercel (Frontend) + Railway (Backend with persistent SQLite volume).

---

## 🚀 Quick Setup Instructions (Local Running)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
- **Interactive API Docs**: `http://127.0.0.1:8000/docs`
- **Health Check**: `http://127.0.0.1:8000/api/health`

*Note: On first startup, the database automatically seeds 5 demo users (`Alice`, `Bob`, `Charlie`, `Diana`, `Edward`), 1:1 chats, group chats ("Signal Core Dev Team"), and message history.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## 📐 Architecture Overview

```
┌─────────────────────────┐          HTTPS (REST)         ┌──────────────────────────┐
│    Next.js Frontend     │ ────────────────────────────> │     FastAPI Backend      │
│  (Zustand + Tailwind)   │ <──────────────────────────── │   (Service-Layer Arch)   │
│                         │        WSS (WebSocket)        │                          │
└─────────────────────────┘ ═════════════════════════════ └────────────┬─────────────┘
                                                                       │
                                                               SQLAlchemy (async)
                                                                       │
                                                                       ▼
                                                             ┌───────────────────┐
                                                             │   SQLite (file,   │
                                                             │ Railway volume)   │
                                                             └───────────────────┘
```

### Backend Layering Principle
`api/*` routes only parse input, call a `services/*` function, and shape the response. All persistence and business logic lives in `services/*`, which talks to the DB through `db/models.py`.

---

## 🗄️ Database Schema

The database consists of 6 ORM models designed with explicit relationships and foreign key cascades:

1. **User** (`users`):
   - `id` (PK), `phone_number` (Unique, Indexed), `username` (Unique, Indexed), `display_name`, `avatar_url`, `is_online`, `last_seen`, `created_at`, `updated_at`.
2. **Contact** (`contacts`):
   - `id` (PK), `user_id` (FK -> users.id), `contact_user_id` (FK -> users.id), `nickname`, `created_at`. Unique constraint on `(user_id, contact_user_id)`.
3. **Conversation** (`conversations`):
   - `id` (PK), `type` (`direct` | `group`), `name`, `avatar_url`, `created_at`, `updated_at`.
4. **ConversationMember** (`conversation_members`):
   - `id` (PK), `conversation_id` (FK -> conversations.id), `user_id` (FK -> users.id), `role` (`member` | `admin`), `joined_at`. Unique constraint on `(conversation_id, user_id)`.
5. **Message** (`messages`):
   - `id` (PK), `conversation_id` (FK -> conversations.id), `sender_id` (FK -> users.id), `content`, `message_type` (`text` | `system`), `created_at`.
6. **MessageStatus** (`message_statuses`):
   - `id` (PK), `message_id` (FK -> messages.id), `user_id` (FK -> users.id), `status` (`sent` | `delivered` | `read`), `updated_at`. Unique constraint on `(message_id, user_id)`.

---

## 📡 API & WebSocket Overview

### REST Endpoints
- **Auth**:
  - `POST /auth/register` - Request OTP for phone number
  - `POST /auth/verify-otp` - Verify OTP (`123456`) & return JWT token
  - `POST /auth/profile-setup` - Configure display name & avatar URL
- **Users & Contacts**:
  - `GET /users/me` - Fetch authenticated user profile
  - `PATCH /users/me` - Update profile details
  - `GET /users/search?q=...` - Search users by name/phone/username
  - `GET /contacts` - List contacts
  - `POST /contacts` - Add new contact
- **Conversations & Messages**:
  - `GET /conversations` - List conversations sorted by recent activity
  - `POST /conversations/direct` - Open/create 1:1 conversation
  - `GET /conversations/{id}` - Fetch conversation detail
  - `DELETE /conversations/{id}/messages` - Clear chat history
  - `DELETE /conversations/{id}` - Delete conversation
  - `GET /conversations/{id}/messages` - Fetch message history
  - `POST /conversations/{id}/messages` - Send message (triggers WebSocket fan-out)
  - `PATCH /conversations/{id}/read` - Mark all unread messages in chat as read
  - `PATCH /messages/{id}/delivered` - Mark message delivered
  - `PATCH /messages/{id}/read` - Mark message read
- **Groups**:
  - `POST /groups` - Create group (creator becomes `admin`)
  - `POST /groups/{id}/members` - Add group members (`admin` only)
  - `DELETE /groups/{id}/members/{user_id}` - Remove member (`admin` only) or leave group
  - `DELETE /groups/{id}` - Delete group (`admin` only)

### Real-Time WebSocket Events (`/ws/{token}`)
- `presence` - User online/offline status updates
- `message:new` - Real-time incoming message payload
- `message:status` - Delivery/read receipt status flips (`sent` -> `delivered` -> `read`)
- `typing` - Live keystroke typing indicator (`"Someone is typing..."`)
- `conversation:new` / `conversation:update` / `conversation:delete` - Real-time group updates

---

## 📝 Assumptions Made

1. **OTP Verification**: Mocked fixed string `123456` for instant onboarding.
2. **Encryption**: Simulated via lock icons `🔒` and *"Signal End-to-End Encrypted"* badges.
3. **Presence**: Broadcast to co-members sharing 1:1 or group conversations.
4. **Group Admin**: Creator automatically gains `ADMIN` privileges; member additions/removals and group deletions require `ADMIN` status.
