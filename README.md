# TaskFlow — Collaborative Task Manager

> A real-time, multi-workspace task management platform built for engineering teams. Drag-and-drop Kanban boards, live presence indicators, instant push notifications, and a full audit trail — all in one place.

---

## Screenshots

<table>
<tr>
<td align="center" width="50%">

**Workspaces**

<a href="https://github.com/user-attachments/assets/5f48678c-17fa-4337-9283-b9f0523102e3">
  <img src="https://github.com/user-attachments/assets/5f48678c-17fa-4337-9283-b9f0523102e3" width="100%">
</a>

</td>

<td align="center" width="50%">

**Workspace Detail — Boards & Members**

<a href="https://github.com/user-attachments/assets/3aa84089-f8b9-46a6-93ef-39220ca1e5e2">
  <img src="https://github.com/user-attachments/assets/3aa84089-f8b9-46a6-93ef-39220ca1e5e2" width="100%">
</a>

</td>
</tr>

<tr>
<td align="center">

**Kanban Board — Live Presence & Labels**

<a href="https://github.com/user-attachments/assets/acfa9cde-d84c-4f4c-bc33-5ef77348e076">
  <img src="https://github.com/user-attachments/assets/acfa9cde-d84c-4f4c-bc33-5ef77348e076" width="100%">
</a>

</td>

<td align="center">

**Task Detail — Activity, Comments & Labels**

<a href="https://github.com/user-attachments/assets/7a1b9f0a-4e6e-452e-9faf-d01b5ba6f2b6">
  <img src="https://github.com/user-attachments/assets/7a1b9f0a-4e6e-452e-9faf-d01b5ba6f2b6" width="100%">
</a>

</td>
</tr>

<tr>
<td align="center">

**My Tasks — Cross-board Personal View**

<a href="https://github.com/user-attachments/assets/79a40ce4-fee8-4bab-bf25-f47185721eeb">
  <img src="https://github.com/user-attachments/assets/79a40ce4-fee8-4bab-bf25-f47185721eeb" width="100%">
</a>

</td>

<td></td>
</tr>
</table>

## Features

**Workspaces & Access Control**
- Multi-workspace support — create isolated workspaces per team or project
- Role-based access control with three tiers: Owner, Admin, and Member
- Invite members by email; roles enforced at every API endpoint
- Workload analytics per workspace member — open task count displayed inline

**Kanban Boards**
- Drag-and-drop task cards across columns with optimistic UI updates
- Sparse position ordering — single-row database update per drag, no full rewrite
- Four default columns auto-created per board: To Do, In Progress, In Review, Done
- Add, rename, and delete columns inline on the board
- Share board via one-click copy link

**Tasks**
- Full task detail panel: title, priority (Low / Medium / High / Urgent), due date, assignee, description
- Colour-coded labels per workspace, visible as chips on cards and in the detail panel
- Soft deletes — deleted tasks are hidden but preserved in the database
- Cross-board personal view: My Tasks shows every task assigned to you, grouped by board

**Real-time**
- Live presence bar — see which team members are viewing the same board right now
- WebSocket rooms per board; Redis Sets with 60-second TTL and 30-second client heartbeat for crash-safe cleanup
- Instant push notifications delivered via WebSocket to the recipient's personal room
- Notifications for task assignment and workspace membership changes

**Audit Trail**
- Immutable append-only log of every significant workspace action
- Logged events: task created/updated/moved/assigned/deleted, columns added/removed, members added/removed/role-changed, comments deleted
- Per-task activity feed visible inside the task detail panel
- Workspace-wide paginated audit log available to all members

**Auth**
- JWT authentication with 15-minute access tokens and 7-day httpOnly refresh token cookies
- Silent token refresh via interceptor — users never see an expiry prompt
- Secure logout revokes the refresh token server-side

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17+, Angular CDK, Angular Signals |
| Backend | NestJS, TypeORM, Passport JWT |
| Primary database | MySQL 8 |
| Cache / presence | Redis 7 |
| Real-time | Socket.io |
| Containerisation | Docker Compose |
| Language | TypeScript (end-to-end) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Frontend                      │
│  Auth Interceptor · Signals · CDK Drag-Drop · Socket.io │
└────────────────────┬──────────────────┬─────────────────┘
                     │ REST (HTTP)       │ WebSocket
┌────────────────────▼──────────────────▼─────────────────┐
│                    NestJS Backend                        │
│  Auth · Workspaces · Boards · Tasks · Comments           │
│  Audit Log · Notifications · WebSocket Gateway           │
└──────────────┬───────────────────────┬──────────────────┘
               │                       │
        ┌──────▼──────┐         ┌──────▼──────┐
        │    MySQL    │         │    Redis    │
        │  (primary)  │         │ (presence)  │
        └─────────────┘         └─────────────┘
```

**Backend modules:**

| Module | Responsibility |
|---|---|
| Auth | Register, login, refresh, logout, JWT strategy |
| Users | User entity and internal lookup methods |
| Workspaces | Workspace CRUD, member management, RBAC |
| Boards | Boards, columns, tasks, labels, workload analytics |
| Comments | Task comment threads with author-scoped edit/delete |
| Audit Log | Append-only workspace activity trail with pagination |
| Notifications | Personal push notifications with read/unread state |
| Gateway | Socket.io WebSocket server — presence and real-time delivery |

**Database — 12 entities:**

```
users · refresh_tokens · workspaces · workspace_members
boards · board_columns · tasks · labels · task_labels
comments · audit_logs · notifications
```

---

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- npm

---

### 1. Clone the repository

```bash
git clone https://github.com/nihams/colab-task-manager.git
cd colab-task-manager
```

---

### 2. Start the database and cache

```bash
docker compose up -d
```

This starts MySQL on port **3306** and Redis on port **6379**.

> **Port conflict on Windows?** If port 3306 is already in use by a local MySQL installation, change the ports line in `docker-compose.yml` from `"3306:3306"` to `"3307:3306"` and update `DB_PORT` in your `.env` to `3307`.

Verify both containers are running:

```bash
docker ps
```

---

### 3. Configure the backend

```bash
cd backend
```

Create a `.env` file (use `.env.example` as a reference):

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=taskmanager

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3000
CLIENT_URL=http://localhost:4200
```

Install dependencies and start the backend:

```bash
npm install
npm run start:dev
```

On first run, TypeORM will automatically create all 12 database tables (`synchronize: true`). You should see:

```
[NestApplication] Nest application successfully started
```

The backend runs at **http://localhost:3000**.

---

### 4. Configure and start the frontend

```bash
cd ../frontend
npm install
ng serve
```

The frontend runs at **http://localhost:4200**.

---

### 5. Open the app

Navigate to [http://localhost:4200](http://localhost:4200) and register an account to get started.

---

## Security

- Passwords hashed with bcrypt (cost factor 12) — never stored in plaintext
- Access tokens short-lived (15 min); refresh tokens stored as httpOnly cookies — inaccessible to JavaScript
- Refresh token hashes stored in the database; revoked on logout
- All sensitive routes protected by `JwtAuthGuard`
- Workspace-level permission checks on every mutating endpoint (`requireRole()`)
- CORS restricted to the Angular dev origin; `credentials: true` required for cookie transport
- DTOs validated globally via `class-validator`; unknown fields rejected (`forbidNonWhitelisted`)

---

## Notes

- **Multi-user testing:** refresh token cookies are shared across tabs in the same browser profile. Use separate profiles or incognito windows when testing two users simultaneously — the same behaviour as Gmail and Slack.
- **Task completion in My Tasks:** all non-deleted assigned tasks appear regardless of column. Tasks in a "Done" column will still show until deleted.

---

## Deployment

Deployment is currently in progress. The application will be hosted with the NestJS backend and MySQL/Redis on [Railway](https://railway.app) and the Angular frontend on [Vercel](https://vercel.com). This README will be updated with live URLs once deployment is complete.

To run this project locally in the meantime, follow the [Local Setup](#local-setup) instructions above.
