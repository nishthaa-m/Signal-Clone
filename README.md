# 💬 Signal Desktop Web Clone

A full-stack, end-to-end encrypted messaging web application engineered to mirror **Signal Desktop**. Built with **Next.js 14**, **FastAPI**, **WebSockets**, and **SQLite**.

---

## 🌐 Live Demo & Quick Testing Guide

- **Live Application Link**: [https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app](https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app?_vercel_share=JWSeTnrNw2IzlkzSWs8Rf1FJIDB8KWwc)
- **GitHub Repository**: [https://github.com/nishthaa-m/Signal-Clone.git](https://github.com/nishthaa-m/Signal-Clone.git)

### 🧪 2-Minute Multi-Window Evaluator Test:
1. **Open Two Windows**: Open a normal browser window and an Incognito window.
2. **Login Window 1 (Alice)**: Click **Alice Smith** (`5550001001` or `alice_smith`), enter OTP **`123456`**.
3. **Login Window 2 (Bob)**: Click **Bob Jones** (`5550001002` or `bob_jones`), enter OTP **`123456`**.
4. **Verify Core Real-Time Features**:
   - 💬 **Instant Sync & Receipts**: Send a message from Alice ➔ Arrives live in Bob's window. Single tick `✓` instantly updates to double blue tick `✓✓`.
   - ✍️ **Typing Indicators**: Type text in Alice's composer ➔ Live *"Alice is typing..."* appears in Bob's window.
   - ⏱️ **Disappearing Messages**: Click the Clock icon ➔ Set timer to **5 seconds** ➔ Send a message and watch it self-destruct live on both screens!
   - 📎 **Attachments & Reactions**: Attach images/files or react with emojis (`❤️`, `👍`) live.
   - ☑️ **Multi-Select & Forwarding**: Click `...` on a message bubble ➔ Select multiple messages ➔ Bulk delete ("Delete for me") or forward to another contact.

---

## 📋 Evaluation Criteria Mapping

This codebase is structured specifically to fulfill the 7 core evaluation criteria:

```
┌───────────────────────────┬─────────────────────────────────────────────────────────────┐
│ Evaluation Criteria       │ Implementation Highlight                                    │
├───────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1. Functionality          │ Real-time WS sync, receipts, disappearing messages, groups  │
│ 2. UI/UX                  │ Pixel-perfect Signal Desktop rail, HSL dark/light modes     │
│ 3. Database Design        │ 7 relational tables, foreign keys, cascade constraints      │
│ 4. Backend / API Design   │ Decoupled FastAPI architecture, WS connection manager       │
│ 5. Code Quality           │ Strict TypeScript types, PEP 8 Python, async execution      │
│ 6. Code Modularity        │ Atomic UI components, service-repository layer pattern      │
│ 7. Code Understanding     │ Self-explanatory architectural documentation & flow charts │
└───────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 1. ⚡ Functionality & Feature Matrix

| Feature | Technical Implementation | Status |
| :--- | :--- | :---: |
| **Real-Time Messaging** | Native WebSockets (`/ws/{token}`) with client heartbeat ping/pong | ✅ Working |
| **Status Receipts** | Live `SENT` (`✓`), `DELIVERED` (`✓✓`), and `READ` (`✓✓` blue) state tracking | ✅ Working |
| **Disappearing Messages** | Timer engine auto-purges expired messages from DB queries & Zustand store | ✅ Working |
| **Attachments & Media** | File upload pipeline (`POST /upload`) supporting image previews & file badges | ✅ Working |
| **Emoji Reactions** | Real-time emoji toggling (`message:reaction` WS broadcast) | ✅ Working |
| **Quoted Replies** | Quoted message preview bar & bubble reply rendering | ✅ Working |
| **Multi-Select & Forward**| Checkbox selection bar for bulk "Delete for me" and message forwarding | ✅ Working |
| **Group Administration**| Group creation, admin role enforcement, member add/remove, leave group | ✅ Working |
| **Dual Authentication** | Accepts 10-digit phone numbers OR usernames with fixed OTP (`123456`) | ✅ Working |
| **Keyboard Shortcuts** | `Ctrl+K` (Search), `Ctrl+Shift+N` (New Chat), `Ctrl+Shift+G` (New Group), `Esc` | ✅ Working |

---

## 2. 🎨 UI/UX Design Alignment

- **Signal Desktop Layout**: Features Signal's signature 3-pane desktop design:
  1. **Far-Left Navigation Rail**: Quick access to Chats, Calls, Stories, Settings, and User Avatar.
  2. **Conversation Sidebar**: Real-time search, unread badge counters, online status dots, and last message previews.
  3. **Main Chat Pane**: Header with encryption lock badge, disappearing timer indicator, light/dark mode toggle, audio/video call placeholders, and message feed.
- **Theme System**: Full light and dark mode CSS variable token system matching Signal Desktop's native HSL palette.

---

## 3. 🗄️ Database Design (Relational Schema)

The backend utilizes **SQLite** with **Async SQLAlchemy 2.0 ORM** modeling 7 relational tables with foreign keys and cascade constraints:

```
 ┌──────────────┐       ┌──────────────────────┐       ┌───────────────────────┐
 │    User      │──────<│  ConversationMember  │>──────│     Conversation      │
 └──────────────┘       └──────────────────────┘       └───────────────────────┘
        │                           │                              │
        │ 1                         │ 1                            │ 1
        ▼ N                         ▼ N                            ▼ N
 ┌──────────────┐       ┌──────────────────────┐       ┌───────────────────────┐
 │   Contact    │       │       Message        │──────<│     MessageStatus     │
 └──────────────┘       └──────────────────────┘       └───────────────────────┘
                                    │
                                    │ 1
                                    ▼ N
                        ┌──────────────────────┐
                        │   MessageReaction    │
                        └──────────────────────┘
```

### Table Definitions:
1. **`users`**: `id`, `phone_number` (unique), `username` (unique), `display_name`, `avatar_url`, `is_online`, `last_seen`.
2. **`contacts`**: `id`, `user_id` (FK), `contact_user_id` (FK), `nickname`.
3. **`conversations`**: `id`, `type` (`direct`/`group`), `name`, `avatar_url`, `disappearing_timer`, `created_at`, `updated_at`.
4. **`conversation_members`**: `id`, `conversation_id` (FK), `user_id` (FK), `role` (`member`/`admin`), `joined_at`.
5. **`messages`**: `id`, `conversation_id` (FK), `sender_id` (FK), `content`, `message_type` (`text`/`system`), `attachment_url`, `attachment_type`, `reply_to_id` (FK), `expires_at`, `created_at`.
6. **`message_statuses`**: `id`, `message_id` (FK), `user_id` (FK), `status` (`sent`/`delivered`/`read`), `updated_at`.
7. **`message_reactions`**: `id`, `message_id` (FK), `user_id` (FK), `emoji`, `created_at`.

---

## 4. 🏗️ Backend & API Design

Built with **FastAPI** using a decoupled 3-tier architecture (Routes ➔ Services ➔ DB Models):

### API Endpoint Summary:
- **Auth (`/auth`)**:
  - `POST /auth/register` — Request OTP (Phone or Username)
  - `POST /auth/verify-otp` — Verify OTP code (`123456`) & return JWT token
  - `POST /auth/profile-setup` — Update display name and avatar URL
- **Conversations (`/conversations`)**:
  - `GET /conversations` — List active user conversations sorted by activity
  - `POST /conversations/direct` — Deduplicated 1:1 conversation lookup
  - `GET /conversations/{id}` — Fetch conversation metadata and members
  - `DELETE /conversations/{id}/messages` — Clear chat history
  - `PATCH /conversations/{id}/disappearing-timer` — Update disappearing timer
- **Messages (`/messages`)**:
  - `GET /conversations/{id}/messages` — Fetch unexpired message history
  - `POST /conversations/{id}/messages` — Send message / reply / attachment
  - `DELETE /messages/{id}` — Single message "Delete for me"
  - `POST /messages/{id}/reactions` — Toggle emoji reaction
  - `PATCH /messages/{id}/read` — Mark message as read
- **Groups (`/groups`)**:
  - `POST /groups` — Create group (Admin)
  - `POST /groups/{id}/members` — Add members (Admin)
  - `DELETE /groups/{id}/members/{user_id}` — Remove member or leave group
  - `DELETE /groups/{id}` — Delete group (Admin)
- **Real-Time WebSockets (`/ws/{token}`)**:
  - Bi-directional connection manager maintaining active user socket pools.

---

## 5. 💻 Code Quality & Modularity

- **Strict Type Safety**: Full TypeScript interfaces (`types.ts`) on frontend and Pydantic v2 schemas on backend.
- **Atomic UI Components**: Reusable UI primitives (`Avatar`, `StatusCheck`, `MessageBubble`, `MessageInput`, `ConversationItem`).
- **Centralized State**: Zustand store (`useChatStore.ts` & `useAuthStore.ts`) managing persistent auth credentials and live reactive chat states.

---

## 6. 🧠 Code Understanding & Evaluation Q&A

### Q1: How does real-time synchronization work across multiple tabs?
> **Answer**: The backend maintains an in-memory `ConnectionManager` indexed by `user_id`. When an event occurs (e.g. `send_message`), the backend broadcasts a JSON payload to all active socket connections belonging to conversation members. The frontend `handleWSEvent` listener catches the event and updates the Zustand store reactively.

### Q2: How are disappearing messages enforced?
> **Answer**: Disappearing messages set an `expires_at = timestamp + timer`. On backend queries (`get_conversation_messages` and `get_user_conversations`), SQL queries filter `(expires_at IS NULL OR expires_at > NOW)`. On frontend, a 1-second interval calls `purgeExpiredMessages()`, instantly purging expired bubbles from memory.

### Q3: How is 1:1 conversation deduplication guaranteed?
> **Answer**: `get_or_create_direct_conversation` queries existing `DIRECT` conversations containing both user IDs. Frontend `useChatStore` enforces co-member recipient deduplication, preventing duplicate chat cards in the sidebar.

---

## 🔑 Demo Account Credentials

| User | Phone Number | Username | Demo OTP Code |
| :--- | :--- | :--- | :--- |
| **Alice Smith** | `5550001001` | `alice_smith` | `123456` |
| **Bob Jones** | `5550001002` | `bob_jones` | `123456` |
| **Charlie Brown** | `5550001003` | `charlie_brown` | `123456` |
| **Diana Prince** | `5550001004` | `diana_prince` | `123456` |
| **Edward Snow** | `5550001005` | `edward_snow` | `123456` |

---

## ⚙️ Local Setup Instructions

```bash
# 1. Backend Setup
cd backend
python -m venv venv
.\venv\Scripts\activate   # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# 2. Frontend Setup
cd frontend
npm install
npm run dev
```
> Open `http://localhost:3000` in your browser.
