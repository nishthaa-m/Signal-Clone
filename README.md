# 💬 Signal Desktop Web Clone — Internship Assignment Submission

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel_Frontend-000000?style=for-the-badge&logo=vercel)](https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app?_vercel_share=JWSeTnrNw2IzlkzSWs8Rf1FJIDB8KWwc)
[![Backend Status](https://img.shields.io/badge/Backend_API-FastAPI_Active-009688?style=for-the-badge&logo=fastapi)](https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Tech_Stack-Next.js_14_|__FastAPI_|__WebSockets_|__SQLite-blue?style=for-the-badge)](#-tech-stack)

A production-grade, full-stack real-time messaging web application inspired by **Signal Desktop**. Designed and implemented to fulfill all requirements for the Full-Stack Engineering Internship Assignment.

---

## 🎯 Evaluator Quick Start & Testing Guide

### 🌐 Live Application Link
👉 **[Click Here to Launch Signal Web Clone Live Demo](https://signal-clone-nishthamaheshwari2020-1197s-projects.vercel.app?_vercel_share=JWSeTnrNw2IzlkzSWs8Rf1FJIDB8KWwc)**

---

### 🔑 Demo Evaluation Credentials

| User Name | Phone Number (10 Digits) | Username | Fixed Demo OTP Code |
| :--- | :--- | :--- | :--- |
| **Alice Smith** | `5550001001` | `alice_smith` | **`123456`** |
| **Bob Jones** | `5550001002` | `bob_jones` | **`123456`** |
| **Charlie Brown** | `5550001003` | `charlie_brown` | **`123456`** |
| **Diana Prince** | `5550001004` | `diana_prince` | **`123456`** |
| **Edward Snow** | `5550001005` | `edward_snow` | **`123456`** |

---

### 🧪 60-Second Multi-Window Real-Time Evaluation Protocol

To test bi-directional real-time WebSocket synchronization across users:

1. **Open Two Browser Windows** side-by-side (e.g., standard browser window & incognito window).
2. **Window 1 (Alice)**: Click **Alice Smith** (`5550001001` / `alice_smith`), enter OTP **`123456`**.
3. **Window 2 (Bob)**: Click **Bob Jones** (`5550001002` / `bob_jones`), enter OTP **`123456`**.
4. **Execute Verification Checklist**:

| Feature to Test | Action in Window 1 (Alice) | Expected Result in Window 2 (Bob) | Status |
| :--- | :--- | :--- | :---: |
| **1:1 Real-Time Chat** | Send text message `"Hello Bob!"` | Arrives instantly over WebSocket without page refresh | ✅ Verified |
| **Read Receipts & Ticks** | Message sent | Alice sees `✓` (sent), `✓✓` (delivered), `✓✓` (blue read when Bob opens chat) | ✅ Verified |
| **Typing Indicator** | Type text into input box | Banner shows *"Alice Smith is typing..."* live in Bob's window | ✅ Verified |
| **Disappearing Messages** | Click Clock icon ➔ Set timer to **5 seconds** ➔ Send message | Message self-destructs live on both screens after 5 seconds | ✅ Verified |
| **Attachments** | Click Paperclip icon ➔ Upload image or file | Rendered image card & download badge appear live | ✅ Verified |
| **Message Reactions** | Click Emoji icon on bubble | Emoji reaction pill (`❤️`, `👍`) updates live on both sides | ✅ Verified |
| **Quoted Replies** | Click Reply icon `↩️` on message | Quoted reply preview box rendered inside message bubble | ✅ Verified |
| **Multi-Select & Forward** | Click `...` ➔ Select ➔ Choose messages ➔ Forward | Opens conversation picker modal and forwards messages to new chat | ✅ Verified |
| **Delete for Me** | Click `...` ➔ Select "Delete for me" | Removes message locally from Alice's view | ✅ Verified |
| **Group Administration** | Click `+` ➔ Create Group ➔ Add Members / Leave | Group updates live for all members; admin controls intact | ✅ Verified |

---

## 🛠️ Architecture & System Design

The application follows a decoupled client-server architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Web Frontend                         │
│   (App Router, React 18, Zustand Stores, Tailwind Signal UI System)    │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ HTTP REST APIs                  │ WebSockets
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Async Backend                           │
│   (Auth Service, Message Engine, WS Connection Manager, Static Files)   │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │ Async SQLAlchemy 2.0 ORM
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       SQLite Relational Database                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Highlights
1. **Real-Time WebSocket Manager (`app/core/ws_manager.py`)**: Maintains active user connection pools, broadcasting real-time events (`message:new`, `message:status`, `message:delete`, `message:reaction`, `typing`, `presence`, `conversation:update`, `conversation:clear`).
2. **Synchronous Sidebar & Chat Sync**: Disappearing timer events and group updates broadcast system notifications that update both the left sidebar conversation list and active chat view simultaneously.
3. **Dual Authentication Support**: Identifiers are parsed dynamically, allowing login using either **10-digit phone numbers** (e.g. `5550001001`) or **usernames** (e.g. `alice_smith`).

---

## 🗄️ Database Schema

The database consists of 7 relational tables managed via SQLAlchemy 2.0 Async ORM:

```
┌───────────────┐        ┌───────────────────┐        ┌───────────────────┐
│     users     │───────<│   contacts        │        │   conversations   │
└───────┬───────┘        └───────────────────┘        └─────────┬─────────┘
        │                                                       │
        ├───────────────────────────────────────────────────────┤
        │                                                       │
        ▼                                                       ▼
┌───────────────┐                                     ┌───────────────────┐
│   messages    │>────────────────────────────────────│conv_members       │
└───────┬───────┘                                     └───────────────────┘
        │
        ├──────────────────────┐
        ▼                      ▼
┌───────────────┐      ┌───────────────┐
│ msg_statuses  │      │ msg_reactions │
└───────────────┘      └───────────────┘
```

1. **`users`**: User profiles, 10-digit normalized phone, username, display name, avatar, online status, last seen.
2. **`contacts`**: Mutual contact mappings and nicknames.
3. **`conversations`**: Direct (1:1) and Group conversation records with disappearing message timer metadata.
4. **`conversation_members`**: Membership roles (`member`, `admin`) and join timestamps.
5. **`messages`**: Text/system messages, media attachment URLs, quoted reply IDs, and disappearing timestamps (`expires_at`).
6. **`message_statuses`**: Per-user delivery and read receipts (`sent`, `delivered`, `read`).
7. **`message_reactions`**: Emoji reaction mappings per user.

---

## 📡 API Reference

### Authentication (`/auth`)
- `POST /auth/register` — Initiate login/registration (accepts 10-digit phone OR username).
- `POST /auth/verify-otp` — Verify OTP (`123456`) and return JWT bearer token.
- `POST /auth/profile-setup` — Update display name & avatar.

### Conversations (`/conversations`)
- `GET /conversations` — Fetch active conversations sorted by activity.
- `POST /conversations/direct` — Retrieve or create 1:1 conversation with target user.
- `GET /conversations/{id}` — Fetch conversation metadata and member list.
- `DELETE /conversations/{id}/messages` — Clear chat history.
- `PATCH /conversations/{id}/disappearing-timer` — Update disappearing message timer.

### Messages (`/messages`)
- `POST /conversations/{id}/messages` — Send text/attachment message or quoted reply.
- `GET /conversations/{id}/messages` — Fetch conversation message history.
- `DELETE /messages/{id}` — Delete single message ("Delete for me").
- `POST /messages/{id}/reactions` — Toggle emoji reaction.
- `PATCH /messages/{id}/read` — Mark message status as READ.

### Groups (`/groups`)
- `POST /groups` — Create a new group conversation (Admin).
- `POST /groups/{id}/members` — Add members to existing group (Admin).
- `DELETE /groups/{id}/members/{user_id}` — Remove member or leave group.
- `DELETE /groups/{id}` — Delete entire group (Admin).

### Uploads (`/upload`)
- `POST /upload` — Upload image or document attachment.

---

## 🚀 Local Run & Automated Test Execution

### 1. Backend Setup & Automated Test Suite

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate      # On Windows
source venv/bin/activate    # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run Automated Test Suites
python tests/test_stage11_advanced_features.py
python tests/test_stage12_realtime_fixes.py
python tests/test_stage13_auth_redesign.py
python tests/test_stage14_multiselect_forward.py
python tests/test_stage15_bugfixes.py
python tests/test_stage16_preview_sync.py

# Launch Backend Development Server
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Launch Development Server
npm run dev
```

---

## 📝 Assumptions, Mocked Data & Evaluation Notes

1. **SMS Gateway Simulation**: Fixed demo OTP `123456` is implemented for instant evaluator testing without SMS costs or delay.
2. **Pre-Seeded Data**: Pre-seeded with 5 realistic user accounts, contacts, direct chats, and group conversations.
3. **File Attachment Storage**: Media/file uploads are saved under `/uploads` and served via static file middleware.
4. **End-to-End Encryption Indicators**: Modeled with visual encryption lock badges in header and chat panes.
5. **Signal Desktop Layout**: UI incorporates Signal Desktop's far-left navigation rail (Chats, Calls, Stories, Settings) with clean "Coming Soon" placeholder screens.
