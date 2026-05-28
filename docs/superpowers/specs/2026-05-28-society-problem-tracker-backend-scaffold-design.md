# Society Problem Tracker — Backend Scaffold Design

**Date**: 2026-05-28
**Status**: Approved
**Scope**: Initial backend scaffold only. No domain models, no auth, no business endpoints. Sets the foundation for future iterations (auth, residents, problems CRUD, admin views).

## Context

`problemTracker` is a society problem-tracking web app being built as an assignment. Residents file problems within their residential society; admins manage and resolve them. The frontend (`frontend/`) is already scaffolded with Next.js 16 + React 19 on port 3000. The `backend/` directory currently exists but is empty.

This spec covers the **initial scaffold only** — Express app, Prisma + PostgreSQL wiring, folder structure, env config, and a single health endpoint. Subsequent iterations will add authentication (Resident/Admin roles) and the Problem CRUD slice on top of this foundation.

## Goals

1. A runnable Node + Express server reachable at `http://localhost:4000`.
2. Prisma connected to a local PostgreSQL database, with a working `prisma migrate dev` flow.
3. A `GET /api/health` endpoint that confirms the server is up and Prisma can reach the DB.
4. Folder structure that signals where future features (auth, problems) will live without restructuring.
5. CORS configured to permit the Next.js frontend on `http://localhost:3000`.

## Non-Goals

- No authentication, JWT, or session handling in this iteration.
- No User, Resident, Admin, Society, or Problem models. Prisma schema contains only a placeholder model so migrations work end-to-end.
- No request validation library (Zod/Joi) yet — to be added when business endpoints land.
- No logging beyond `morgan` request logs (no `winston` / structured logging yet).
- No security middleware beyond CORS (no `helmet`, no rate limiting yet).
- No tests in this iteration. A test setup will be added when business logic is introduced.
- No Docker / docker-compose. PostgreSQL is assumed to be installed locally or pointed at a hosted instance via `DATABASE_URL`.

## Tech Stack

| Concern        | Choice                                       |
| -------------- | -------------------------------------------- |
| Runtime        | Node.js v20 LTS (or newer)                   |
| Framework      | Express 4                                    |
| Language       | JavaScript (CommonJS)                        |
| ORM            | Prisma                                       |
| Database       | PostgreSQL                                   |
| Hot reload     | `nodemon`                                    |
| Env loading    | `dotenv`                                     |
| Request log    | `morgan`                                     |
| CORS           | `cors`                                       |

## Folder Structure

All paths relative to `problemTracker/backend/`.

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   └── env.js
│   ├── db/
│   │   └── prisma.js
│   ├── routes/
│   │   ├── index.js
│   │   └── health.routes.js
│   ├── controllers/
│   │   └── health.controller.js
│   ├── services/                  # empty; placeholder for future business logic
│   ├── middleware/
│   │   ├── error.middleware.js
│   │   └── notFound.middleware.js
│   ├── utils/
│   │   └── asyncHandler.js
│   ├── app.js
│   └── server.js
├── .env                           # gitignored
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Module responsibilities

- **`src/server.js`** — Entrypoint. Loads env, imports `app`, starts HTTP listener on `PORT`. Handles `SIGINT`/`SIGTERM` for graceful Prisma disconnect.
- **`src/app.js`** — Builds and exports the Express app: applies `cors`, `morgan`, JSON body parser, mounts `/api` routes, then attaches `notFound` and `error` middlewares last.
- **`src/config/env.js`** — Reads `process.env`, validates that required vars are present, exports a typed-ish config object (`{ port, nodeEnv, databaseUrl, corsOrigin }`). Throws on startup if a required var is missing.
- **`src/db/prisma.js`** — Exports a singleton `PrismaClient` instance to be reused across the app.
- **`src/routes/index.js`** — Mounts feature routers under `/api` (currently just health).
- **`src/routes/health.routes.js`** — Defines `GET /health` and binds it to the controller.
- **`src/controllers/health.controller.js`** — Returns server health + DB reachability.
- **`src/middleware/notFound.middleware.js`** — Catches unmatched routes, returns 404 JSON.
- **`src/middleware/error.middleware.js`** — Central error handler. Returns `{ error: { message, status } }`. Hides stack traces when `NODE_ENV === 'production'`.
- **`src/utils/asyncHandler.js`** — `fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`. Lets controllers `throw` and rely on the central error handler.
- **`src/services/`** — Empty placeholder. Future auth/problem services live here.

## Environment Variables

`.env.example` (committed):

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/problem_tracker?schema=public
CORS_ORIGIN=http://localhost:3000
```

All four are required at startup. `config/env.js` throws if any are missing, with a clear error message naming the missing variable.

## Prisma Schema (initial)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Placeholder model so `prisma migrate dev` produces an initial migration.
// Replace with real domain models (User, Society, Problem) in the next iteration.
model HealthPing {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
}
```

## Health Endpoint Contract

`GET /api/health`

**200 OK**

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-05-28T10:30:00.000Z",
  "db": "connected"
}
```

**503 Service Unavailable** (if Prisma `SELECT 1` fails)

```json
{
  "status": "degraded",
  "uptime": 12.34,
  "timestamp": "2026-05-28T10:30:00.000Z",
  "db": "disconnected"
}
```

The controller calls `prisma.$queryRaw\`SELECT 1\`` to verify DB reachability. Failure does not crash the server; it returns 503 so monitoring tools can detect DB issues.

## Error Handling Contract

All error responses return JSON in this shape:

```json
{
  "error": {
    "message": "Human-readable message",
    "status": 404
  }
}
```

- Unmatched routes → 404 from `notFound.middleware`.
- Thrown errors from controllers → caught by `asyncHandler`, forwarded to `error.middleware`.
- `error.middleware` reads `err.status` (defaulting to 500) and `err.message` (defaulting to `"Internal Server Error"`).
- In `development`, the response also includes `stack`. In `production`, stack is omitted.

## `package.json` Scripts

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

### Dependencies

- `express`
- `@prisma/client`
- `dotenv`
- `cors`
- `morgan`

### Dev dependencies

- `nodemon`
- `prisma`

## `.gitignore`

At minimum:

```
node_modules/
.env
.env.local
*.log
```

## README

Brief, action-oriented. Sections:

1. **Prerequisites** — Node 20+, PostgreSQL running locally (or DATABASE_URL pointing to a hosted instance).
2. **Setup** — `npm install`, `cp .env.example .env`, edit `DATABASE_URL`, `npm run prisma:migrate`.
3. **Run** — `npm run dev`, then `curl http://localhost:4000/api/health`.
4. **Project structure** — one-line description per top-level folder.
5. **Next steps** — note that auth + problems CRUD are the next feature iteration.

## Verification Criteria

After implementation, all of the following must hold:

1. `npm install` completes without errors in `backend/`.
2. `npm run prisma:migrate` creates an initial migration and applies it to the configured PostgreSQL database.
3. `npm run dev` starts the server with a log line confirming `PORT` and `NODE_ENV`.
4. `curl http://localhost:4000/api/health` returns 200 with `db: "connected"` when the database is up.
5. Stopping PostgreSQL and re-curling `/api/health` returns 503 with `db: "disconnected"` — the server does not crash.
6. `curl http://localhost:4000/api/does-not-exist` returns 404 JSON in the documented error shape.
7. Requests from the Next.js frontend (`http://localhost:3000`) do not trigger CORS errors when hitting `/api/health`.
8. Removing any required env var from `.env` causes the server to fail at startup with a clear error naming the missing variable.

## Out of Scope / Future Iterations

The following are explicitly deferred and will be designed in follow-up specs:

- **Auth iteration**: User model (resident, admin roles), register/login endpoints, JWT issuance, role-based middleware, password hashing.
- **Domain iteration**: Society model, Problem model (title, description, category, status, reporter, assignedTo), Problem CRUD endpoints, status transitions.
- **Hardening iteration**: `helmet`, rate limiting, request validation (Zod), structured logging, integration tests.
