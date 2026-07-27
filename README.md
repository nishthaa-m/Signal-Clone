# 💬 Signal Desktop Web Clone

A full-stack, end-to-end encrypted messaging web application inspired by **Signal Desktop**. Built using **Next.js 14**, **FastAPI**, **WebSockets**, and **SQLite**.

---

### 🌐 Live Demo & Testing Instructions

- **Live Application Link**: [https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app](https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app?_vercel_share=JWSeTnrNw2IzlkzSWs8Rf1FJIDB8KWwc)

#### 🧪 Quick Evaluation & Real-Time Multi-Window Testing Guide:
1. **Open Two Browser Windows** (e.g. Normal window & Incognito window).
2. **Window 1 (Login as Alice)**: Click **Alice Smith** (`5550001001` or `alice_smith`), enter OTP **`123456`**.
3. **Window 2 (Login as Bob)**: Click **Bob Jones** (`5550001002` or `bob_jones`), enter OTP **`123456`**.
4. **Test Real-Time Features**:
   - 💬 **Messaging & Status**: Send a message from Alice ➔ Watch it arrive live in Bob's window with single tick `✓` turning double blue `✓✓` instantly.
   - ✍️ **Typing Indicators**: Type in input box ➔ Watch *"Alice is typing..."* appear live in Bob's window.
   - ⏱️ **Disappearing Messages**: Click the Clock icon ➔ Set timer to **5 seconds** ➔ Send a message and watch it self-destruct live on both screens!
   - 📎 **Attachments & Reactions**: Attach images/files or react with emojis (`❤️`, `👍`) live.
   - ☑️ **Multi-Select & Forwarding**: Click three dots `...` ➔ Select multiple messages ➔ Bulk delete or forward to another chat.

---

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite with SQLAlchemy 2.0 (Async ORM)
- **Real-Time Engine**: Native WebSockets with custom Connection Manager
- **Authentication**: JWT (JSON Web Tokens) with 10-digit Phone or Username Login
- **File Storage**: Static File Server (`/uploads`)

### Frontend
- **Framework**: Next.js 14 (App Router, React 18, TypeScript)
- **State Management**: Zustand
- **Styling**: Tailwind CSS with Custom Signal Design System (Light/Dark mode)
- **Icons**: Lucide React
- **Utilities**: Date-fns

---

## 🏗️ Architecture Overview

The application follows a clean decoupled client-server architecture:

```
┌─────────────────────────────────────────────────────────┐
│                 Next.js 14 Frontend                     │
│  (Zustand Stores, React Server Components, WebSockets)  │
└───────────┬─────────────────────────────────┬───────────┘
            │ HTTP REST APIs                  │ WebSockets
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

- **Bi-directional WebSockets (`/ws/chat`)**: Broadcasts real-time events including `message:new`, `message:status` (sent/delivered/read), `message:delete`, `message:reaction`, `typing`, `presence` (online/last seen), and `conversation:update`.
- **Dual Authentication**: Accepts either a **10-digit phone number** (e.g. `5550001001`) or a **username** (e.g. `alice_smith`).
- **Disappearing Messages Engine**: Auto-purges expired messages synchronously across frontend state stores and backend database queries.
- **Single & Multi-Message Selection**: Enables bulk or individual "Delete for Me" and message forwarding.

---

## 🗄️ Database Schema

The database consists of 7 relational tables:

1. **`users`**:
   - `id` (INT, Primary Key)
   - `phone_number` (VARCHAR, Unique)
   - `username` (VARCHAR, Unique, Optional)
   - `display_name` (VARCHAR)
   - `avatar_url` (VARCHAR)
   - `is_online` (BOOLEAN)
   - `last_seen` (DATETIME)

2. **`contacts`**:
   - `id` (INT, Primary Key)
   - `user_id` (INT, Foreign Key -> users.id)
   - `contact_user_id` (INT, Foreign Key -> users.id)
   - `nickname` (VARCHAR)

3. **`conversations`**:
   - `id` (INT, Primary Key)
   - `type` (ENUM: `direct`, `group`)
   - `name` (VARCHAR, Optional)
   - `avatar_url` (VARCHAR, Optional)
   - `disappearing_timer` (INT, default 0)
   - `created_at` / `updated_at` (DATETIME)

4. **`conversation_members`**:
   - `id` (INT, Primary Key)
   - `conversation_id` (INT, Foreign Key -> conversations.id)
   - `user_id` (INT, Foreign Key -> users.id)
   - `role` (ENUM: `member`, `admin`)
   - `joined_at` (DATETIME)

5. **`messages`**:
   - `id` (INT, Primary Key)
   - `conversation_id` (INT, Foreign Key -> conversations.id)
   - `sender_id` (INT, Foreign Key -> users.id)
   - `content` (TEXT)
   - `message_type` (ENUM: `text`, `system`)
   - `attachment_url` / `attachment_type` (VARCHAR, Optional)
   - `reply_to_id` (INT, Foreign Key -> messages.id, Optional)
   - `expires_at` (DATETIME, Optional)
   - `created_at` (DATETIME)

6. **`message_statuses`**:
   - `id` (INT, Primary Key)
   - `message_id` (INT, Foreign Key -> messages.id)
   - `user_id` (INT, Foreign Key -> users.id)
   - `status` (ENUM: `sent`, `delivered`, `read`)
   - `updated_at` (DATETIME)

7. **`message_reactions`**:
   - `id` (INT, Primary Key)
   - `message_id` (INT, Foreign Key -> messages.id)
   - `user_id` (INT, Foreign Key -> users.id)
   - `emoji` (VARCHAR)
   - `created_at` (DATETIME)

---

## 📡 API Overview

### Authentication (`/auth`)
- `POST /auth/register` — Request registration OTP (Phone or Username)
- `POST /auth/login` — Request login OTP
- `POST /auth/verify-otp` — Verify OTP (fixed demo code `123456`) and receive JWT token
- `POST /auth/profile-setup` — Update display name and avatar

### Conversations (`/conversations`)
- `GET /conversations` — Fetch user's active conversations
- `POST /conversations/direct` — Get or create 1:1 chat with target user
- `GET /conversations/{id}` — Fetch conversation details
- `DELETE /conversations/{id}/messages` — Clear chat history (broadcasts `conversation:clear`)
- `DELETE /conversations/{id}` — Delete conversation
- `PATCH /conversations/{id}/disappearing-timer` — Update disappearing message timer

### Messages (`/messages`)
- `POST /conversations/{id}/messages` — Send text/media message or reply
- `GET /conversations/{id}/messages` — Fetch conversation message history
- `DELETE /messages/{id}` — Delete single message ("Delete for me")
- `POST /messages/{id}/reactions` — Toggle emoji reaction on message
- `PATCH /messages/{id}/read` — Mark message as read

### Groups (`/groups`)
- `POST /groups` — Create a new group conversation (Admin)
- `POST /groups/{id}/members` — Add members to group (Admin)
- `DELETE /groups/{id}/members/{user_id}` — Remove member or leave group
- `DELETE /groups/{id}` — Delete entire group (Admin)

### Media Uploads (`/upload`)
- `POST /upload` — Upload image or file attachment (returns `/uploads/{filename}`)

---

## 🔑 Demo Account Credentials

Use any of these pre-seeded demo accounts to test multi-window real-time chat:

| User | Phone Number | Username | Demo OTP Code |
| :--- | :--- | :--- | :--- |
| **Alice Smith** | `5550001001` | `alice_smith` | `123456` |
| **Bob Jones** | `5550001002` | `bob_jones` | `123456` |
| **Charlie Brown** | `5550001003` | `charlie_brown` | `123456` |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend development server
python -m uvicorn app.main:app --reload --port 8000
```
> Server will start at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run frontend development server
npm run dev
```
> Web app will start at `http://localhost:3000`.

---

## 📌 Assumptions Made

1. **OTP Verification**: SMS gateway is simulated using a fixed OTP (`123456`) for instant testing and demonstration.
2. **File Storage**: Uploaded file and image attachments are stored locally inside `frontend/public/uploads` and served via FastAPI static file mounting at `/uploads`.
3. **Database**: SQLite is used for lightweight, zero-configuration local persistence (`backend/signal_clone.db`).
