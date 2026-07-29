# TaskFlow — Angular Frontend

Complete Angular 19 frontend for the Collaborative Task Manager NestJS backend.
Built to the frontend-handoff spec: standalone components only, Signals for state,
functional auth interceptor, socket.io-client, Angular CDK drag & drop, custom SCSS,
lazy-loaded routes, `@if`/`@for` syntax, `inject()` everywhere, tokens in memory only.

---

## 1. Where to put this folder

Place this folder next to `backend/` in your repo root:

```
Collaborative-Task-Manager/
├── backend/        ← existing NestJS app (unchanged)
└── frontend/       ← this folder
```

## 2. Run locally

Prerequisites: backend running on `http://localhost:3000` with MySQL (3307) and Redis (6379) up.

```bash
cd frontend
npm install
npm start          # serves on http://localhost:4200
```

That's it. The backend's CORS is already configured for `http://localhost:4200`
with `credentials: true`, and `src/environments/environment.ts` already points at
`http://localhost:3000` for both HTTP and WebSocket. No backend changes needed.

Verify the integration end to end:
1. Register at `/register` → you land on `/workspaces` (access token in memory, refresh cookie set).
2. Hard-refresh the page → you stay logged in (silent `/auth/refresh` via the auth guard).
3. Create a workspace → create a board → the 4 default columns appear.
4. Add tasks, drag them between columns (optimistic update + `PATCH /tasks/:id/move`).
5. Open a task → edit title/priority/due date/assignee/description, add labels and comments.
6. Open the same board in a second browser as another member → presence avatars appear
   (heartbeat every 30 s keeps the Redis TTL alive).
7. Assign a task to the other user → they get a real-time notification in the bell.

## 3. Project structure

Matches the handoff document exactly:

```
src/
├── environments/environment.ts / environment.prod.ts
└── app/
    ├── app.component.ts / app.config.ts / app.routes.ts
    ├── core/
    │   ├── models.ts                       ← all API interfaces
    │   ├── services/  auth.service.ts, socket.service.ts,
    │   │              notification.service.ts, board-registry.service.ts
    │   ├── interceptors/auth.interceptor.ts
    │   └── guards/auth.guard.ts
    ├── features/
    │   ├── auth/login, auth/register
    │   ├── workspace/workspace-list, workspace/workspace-detail
    │   ├── board/board-view, board/task-card, board/task-detail
    │   └── notifications/notification-bell
    └── shared/components/navbar, presence-bar
```

## 4. Backend endpoints this frontend expects (v2)

Beyond the original API surface, this build relies on the newer endpoints you added:

- `GET /auth/me` — full current-user object; populates the navbar avatar/name.
- `GET /workspaces/:id/boards` — powers the board list on the workspace page.
- `GET /tasks/assigned-to-me` — powers the My Tasks page. Expected to return an
  array of tasks, ideally with the `board` relation loaded (`board: { id, name }`)
  so tasks group under readable board names; without it, the page falls back to a
  shortened board id as the group title. Reference implementation:

```ts
// boards.controller.ts
@Get('tasks/assigned-to-me')
getMyTasks(@Req() req: Request & { user: User }) {
  return this.boardsService.getTasksAssignedTo(req.user.id);
}

// boards.service.ts
async getTasksAssignedTo(userId: string) {
  return this.taskRepo.find({
    where: { assigned_to: userId },
    relations: ['board'],
    order: { due_date: 'ASC' },
  });
}
```

- **"You were added to a workspace" notification** — the frontend renders a
  MEMBER_ADDED notification type (house icon) in the bell and on /notifications.
  To emit it, add `MEMBER_ADDED = 'MEMBER_ADDED'` to the NotificationType enum and
  drop this into `WorkspacesService.addMember()` after the member row is saved
  (inject NotificationsService in the module the same way BoardsService does):

```ts
const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
await this.notificationsService.create({
  recipient_id: user.id,
  type: NotificationType.MEMBER_ADDED,
  title: 'Added to a workspace',
  body: `You were added to "${workspace?.name}" as ${role}`,
  link: `/workspaces/${workspaceId}`,
});
```

Because MySQL enum columns are strict, restart with `synchronize` on (or migrate)
after adding the enum value.

Also note: `GET /boards/:id` should include the label relations
(`'columns.tasks.taskLabels', 'columns.tasks.taskLabels.label'`) so label chips
survive a refresh — the frontend tolerates their absence but chips will be
missing until tasks are opened.

## 4b. Known limitation — two users in one browser

The refresh token is a single httpOnly cookie shared by **all tabs of a browser
profile**. If user B logs in from a second tab, their refresh token overwrites
user A's. Tab A keeps working on its in-memory access token — until it's
refreshed, at which point the silent-refresh uses the (now user B) cookie and the
tab switches identity. This is inherent to cookie-based refresh and matches how
most web apps behave. For testing with two users simultaneously, use an incognito
window or a separate browser profile for the second account.

## 5. Deploying on free tiers

The refresh-token cookie is `SameSite: Lax`, so it will **not** be sent cross-site.
If the frontend and backend live on different domains, silent refresh breaks and users
get logged out every 15 minutes. The fix (without touching backend code) is to proxy
API calls through the frontend's domain so the cookie is first-party. The WebSocket
connects directly to the backend — it authenticates with the token, not the cookie.

### Step 1 — Databases

- **Redis → Render Key Value (free, 25 MB).** Create it in the same Render region as
  the backend. Use the **internal** hostname/port for `REDIS_HOST` / `REDIS_PORT` —
  it needs no password, which matches the backend's config (it only reads host + port).
- **MySQL** — Render has no free MySQL. Free options: **Aiven free MySQL**,
  **filess.io**, or Railway's trial credit. Note: the backend's TypeORM config has no
  SSL option, so prefer a provider that allows non-TLS connections (filess.io does;
  Aiven requires TLS and may need a tiny config tweak). Create a database named
  `taskmanager` and note host/port/user/password.

### Step 2 — Backend on Render (free web service)

1. Push the repo to GitHub, create a Render **Web Service** from it, root directory `backend`.
2. Build command: `npm install && npm run build` · Start command: `node dist/main.js`
3. Environment variables (from `.env.example`):
   `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`,
   `REDIS_HOST`, `REDIS_PORT` (internal Render Key Value values),
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long random strings),
   `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`,
   `NODE_ENV=production`, `PORT=3000`,
   `CLIENT_URL=https://YOUR-FRONTEND.vercel.app` (add after step 3; needed for CORS).
4. Note your backend URL, e.g. `https://taskflow-api.onrender.com`.
5. Free-tier caveat: Render spins down after ~15 min idle; the first request takes
   ~30–60 s to wake. Fine for demos.

### Step 3 — Frontend on Vercel (free)

1. Edit two files in this folder:
   - `vercel.json` → replace every `https://YOUR-BACKEND.onrender.com` with your real backend URL.
   - `src/environments/environment.prod.ts` → set `wsUrl` to your backend URL.
     Leave `apiUrl: ''` — HTTP calls go same-origin through the Vercel proxy, which is
     what keeps the refresh cookie working.
2. Import the repo into Vercel, set the **root directory** to `frontend`. Build command
   and output directory are already in `vercel.json`.
3. Deploy, copy the Vercel URL, and set it as `CLIENT_URL` on the Render backend
   (then redeploy the backend once so CORS picks it up).

### Alternative (simplest of all, no proxy)

Run everything on one **Oracle Cloud Always Free** ARM VM with docker-compose
(backend + MySQL + Redis) behind Caddy, and serve the built frontend
(`dist/frontend/browser`) from the same domain. Same-origin, so cookies just work.
More setup, but genuinely free forever and nothing sleeps.

## 6. Useful commands

```bash
npm start            # dev server on :4200
npm run build        # production build → dist/frontend/browser
```
