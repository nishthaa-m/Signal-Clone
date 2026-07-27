# 💬 Signal Desktop Web Clone

A full-stack, real-time encrypted messaging application built with **Next.js 14**, **FastAPI**, **WebSockets**, and **SQLite**.

> 🌐 **Live Demo**: [https://signal-clone-eta.vercel.app/](https://signal-clone-eta.vercel.app/)  
> 🔑 **Demo Login**: **Alice** (`5550001001`) | **Bob** (`5550001002`) | **OTP**: `123456`

---

## ⚡ Quick Testing (Multi-Window Real-Time Evaluation)

1. Open two browser windows at the [Live Demo Link](https://signal-clone-eta.vercel.app/).
2. Log in as **Alice** in Window 1 and **Bob** in Window 2 (use OTP `123456`).
3. Test all real-time WebSocket features:
   - **Live Messaging & Read Receipts**: Sent messages update from `✓` to blue `✓✓` instantly.
   - **Typing Indicators**: Active typing reflects in real-time.
   - **Disappearing Messages**: Set timer to 5s to watch messages auto-purge live.
   - **Attachments & Reactions**: Upload media or react with emojis.
   - **Multi-Select & Forwarding**: Select multiple messages to delete or forward.
   - And many more..

---

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Lucide React
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0 (Async ORM), SQLite, PyJWT
- **Real-Time Engine**: Native WebSockets (`/ws/chat`)
- **File Storage**: Static File Middleware (`/uploads`)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Next.js 14 Frontend                     │
│    (Zustand Stores, React App Router, WebSockets)       │
└───────────┬─────────────────────────────────┬───────────┘
            │ HTTP REST APIs                  │ WebSockets (/ws)
            ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│                 FastAPI Backend                         │
│   (Auth, Messaging, Groups, Reactions, Uploads, WS)     │
└───────────┬─────────────────────────────────────────────┘
            │ Async SQLAlchemy ORM
            ▼
┌─────────────────────────────────────────────────────────┐
│                   SQLite Database                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

The SQLite database contains 7 relational tables:

1. `users` (`id`, `phone_number`, `username`, `display_name`, `avatar_url`, `is_online`, `last_seen`)
2. `contacts` (`id`, `user_id`, `contact_user_id`, `nickname`)
3. `conversations` (`id`, `type`, `name`, `avatar_url`, `disappearing_timer`, `created_at`, `updated_at`)
4. `conversation_members` (`id`, `conversation_id`, `user_id`, `role`, `joined_at`)
5. `messages` (`id`, `conversation_id`, `sender_id`, `content`, `message_type`, `attachment_url`, `reply_to_id`, `expires_at`, `created_at`)
6. `message_statuses` (`id`, `message_id`, `user_id`, `status`, `updated_at`)
7. `message_reactions` (`id`, `message_id`, `user_id`, `emoji`, `created_at`)

---

## 📡 API Overview

### Authentication (`/auth`)
- `POST /auth/register` — Request OTP (Phone or Username)
- `POST /auth/verify-otp` — Verify OTP (`123456`) and issue JWT session token
- `POST /auth/profile-setup` — Set display name & avatar

### Conversations & Messaging (`/conversations`, `/messages`)
- `GET /conversations` — List active user conversations
- `POST /conversations/direct` — Get/Create 1:1 conversation
- `POST /conversations/{id}/messages` — Send text/media message or reply
- `GET /conversations/{id}/messages` — Fetch message history
- `DELETE /messages/{id}` — Delete single message ("Delete for me")
- `POST /messages/{id}/reactions` — Toggle emoji reaction
- `PATCH /conversations/{id}/disappearing-timer` — Update disappearing message timer

### Groups (`/groups`)
- `POST /groups` — Create group (Admin)
- `POST /groups/{id}/members` — Add members (Admin)
- `DELETE /groups/{id}/members/{user_id}` — Remove member or leave group
- `DELETE /groups/{id}` — Delete group (Admin)

### Attachments & WebSockets
- `POST /upload` — Upload file/image attachment
- `WS /ws/{token}` — Bi-directional WebSocket endpoint

---

## ⚙️ Local Setup Instructions

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate | macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
> Backend runs at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
> Frontend runs at `http://localhost:3000`.

---

## 📌 Assumptions Made

1. **OTP Gateway**: SMS verification is simulated using a fixed OTP (`123456`) for evaluator convenience.
2. **File Storage**: Uploaded attachments are stored locally under `/uploads` and served via static middleware.
3. **Database**: SQLite is used for zero-configuration local persistence (`signal_clone.db`).
