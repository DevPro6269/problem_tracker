# Society Problem Tracker — Backend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a runnable Node + Express scaffold under `backend/` with Prisma + PostgreSQL wired up, a working `GET /api/health` endpoint, central error handling, and CORS configured for the Next.js frontend on `:3000`.

**Architecture:** Layered MVC — `routes → controllers → services (empty stub) → db (Prisma singleton)`. Express app is assembled in `src/app.js`, started by `src/server.js`. Env vars are validated on startup via `src/config/env.js`. All async controllers are wrapped with `asyncHandler` so errors funnel through a central error middleware.

**Tech Stack:** Node.js v20 LTS, Express 4 (CommonJS), Prisma + PostgreSQL, `dotenv`, `cors`, `morgan`, `nodemon`.

**Spec reference:** `docs/superpowers/specs/2026-05-28-society-problem-tracker-backend-scaffold-design.md`

**Note on testing:** Per the spec ("Non-Goals"), no automated test suite is part of this iteration. Verification is performed via manual `curl` checks and Prisma CLI commands. Each task ends with an explicit verification step before committing.

---

## File Structure

All paths are relative to repository root `/Users/devrathore/Desktop/developement/problemTracker/`.

| Path | Responsibility |
| ---- | -------------- |
| `backend/package.json` | npm metadata, scripts, deps |
| `backend/.gitignore` | Exclude `node_modules/`, `.env`, `*.log` |
| `backend/.env.example` | Template env file (committed) |
| `backend/.env` | Local env values (gitignored, created by developer) |
| `backend/prisma/schema.prisma` | Prisma schema with placeholder `HealthPing` model |
| `backend/src/config/env.js` | Load + validate env vars, export config object |
| `backend/src/db/prisma.js` | Singleton `PrismaClient` |
| `backend/src/utils/asyncHandler.js` | Wraps async controllers, forwards errors to `next` |
| `backend/src/middleware/notFound.middleware.js` | 404 JSON handler |
| `backend/src/middleware/error.middleware.js` | Central error JSON handler |
| `backend/src/controllers/health.controller.js` | Returns server + DB health |
| `backend/src/routes/health.routes.js` | Defines `GET /health` |
| `backend/src/routes/index.js` | Mounts feature routers under `/api` |
| `backend/src/services/.gitkeep` | Reserve folder for future business logic |
| `backend/src/app.js` | Express app assembly |
| `backend/src/server.js` | Process entrypoint; HTTP listener; graceful shutdown |
| `backend/README.md` | Setup + run instructions |

---

## Task 1: Initialize npm project, install dependencies, write `.gitignore` and `.env.example`

**Files:**
- Create: `backend/package.json`
- Create: `backend/.gitignore`
- Create: `backend/.env.example`

- [ ] **Step 1: Confirm `backend/` directory exists and is empty**

Run:
```bash
ls -la /Users/devrathore/Desktop/developement/problemTracker/backend/
```
Expected: directory exists; no files besides `.` and `..`.

- [ ] **Step 2: Initialize npm and overwrite generated `package.json` with the canonical version**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npm init -y
```

Then overwrite `backend/package.json` with this exact content:

```json
{
  "name": "problem-tracker-backend",
  "version": "0.1.0",
  "private": true,
  "description": "Backend API for the Society Problem Tracker assignment",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "license": "ISC"
}
```

- [ ] **Step 3: Install runtime dependencies**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npm install express @prisma/client dotenv cors morgan
```
Expected: deps appear under `"dependencies"` in `package.json`; `node_modules/` is created.

- [ ] **Step 4: Install dev dependencies**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npm install --save-dev nodemon prisma
```
Expected: deps appear under `"devDependencies"`.

- [ ] **Step 5: Create `backend/.gitignore`**

Write the following to `backend/.gitignore`:

```
node_modules/
.env
.env.local
.env.*.local
*.log
npm-debug.log*
.DS_Store
```

- [ ] **Step 6: Create `backend/.env.example`**

Write the following to `backend/.env.example`:

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/problem_tracker?schema=public
CORS_ORIGIN=http://localhost:3000
```

- [ ] **Step 7: Verify install**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && node -e "console.log(require('express').version || 'express loaded')"
```
Expected: prints `express loaded` (or similar) with no error.

- [ ] **Step 8: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/package.json backend/package-lock.json backend/.gitignore backend/.env.example && git commit -m "feat(backend): initialize npm project with express, prisma, and tooling"
```

---

## Task 2: Add Prisma schema with placeholder model

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Create `backend/prisma/` directory**

Run:
```bash
mkdir -p /Users/devrathore/Desktop/developement/problemTracker/backend/prisma
```

- [ ] **Step 2: Write `backend/prisma/schema.prisma`**

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

- [ ] **Step 3: Verify Prisma can parse the schema**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npx prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid 🚀`.

- [ ] **Step 4: Generate the Prisma client**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npx prisma generate
```
Expected: `✔ Generated Prisma Client` message.

- [ ] **Step 5: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/prisma/schema.prisma && git commit -m "feat(backend): add prisma schema with placeholder HealthPing model"
```

---

## Task 3: Create env config and Prisma singleton

**Files:**
- Create: `backend/src/config/env.js`
- Create: `backend/src/db/prisma.js`

- [ ] **Step 1: Create `src/config/` and `src/db/` directories**

Run:
```bash
mkdir -p /Users/devrathore/Desktop/developement/problemTracker/backend/src/config /Users/devrathore/Desktop/developement/problemTracker/backend/src/db
```

- [ ] **Step 2: Write `backend/src/config/env.js`**

```javascript
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['PORT', 'NODE_ENV', 'DATABASE_URL', 'CORS_ORIGIN'];

const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === '');
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy backend/.env.example to backend/.env and fill in the values.`,
  );
}

const port = Number.parseInt(process.env.PORT, 10);
if (Number.isNaN(port)) {
  throw new Error(`PORT must be a number, got "${process.env.PORT}"`);
}

module.exports = {
  port,
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN,
  isProduction: process.env.NODE_ENV === 'production',
};
```

- [ ] **Step 3: Write `backend/src/db/prisma.js`**

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
```

- [ ] **Step 4: Verify env loading by writing a temporary `.env` and importing the config**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && cp .env.example .env && node -e "console.log(require('./src/config/env'))"
```
Expected: prints an object containing `port: 4000`, `nodeEnv: 'development'`, `databaseUrl: 'postgresql://...'`, `corsOrigin: 'http://localhost:3000'`, `isProduction: false`.

- [ ] **Step 5: Verify missing-var failure**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && PORT= node -e "delete process.env.PORT; require('dotenv').config({path:'/dev/null'}); require('./src/config/env')"
```
Expected: throws `Missing required environment variables: PORT, NODE_ENV, DATABASE_URL, CORS_ORIGIN`. (Exit code non-zero.)

- [ ] **Step 6: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/src/config/env.js backend/src/db/prisma.js && git commit -m "feat(backend): add env config validation and prisma client singleton"
```

---

## Task 4: Create `asyncHandler` utility

**Files:**
- Create: `backend/src/utils/asyncHandler.js`

- [ ] **Step 1: Create `src/utils/` directory**

Run:
```bash
mkdir -p /Users/devrathore/Desktop/developement/problemTracker/backend/src/utils
```

- [ ] **Step 2: Write `backend/src/utils/asyncHandler.js`**

```javascript
// Wraps an async Express controller so any thrown error or rejected promise
// is forwarded to the central error middleware via `next`.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```

- [ ] **Step 3: Verify the module loads**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && node -e "const h = require('./src/utils/asyncHandler'); console.log(typeof h === 'function' ? 'ok' : 'fail')"
```
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/src/utils/asyncHandler.js && git commit -m "feat(backend): add asyncHandler utility for express controllers"
```

---

## Task 5: Create `notFound` and `error` middleware

**Files:**
- Create: `backend/src/middleware/notFound.middleware.js`
- Create: `backend/src/middleware/error.middleware.js`

- [ ] **Step 1: Create `src/middleware/` directory**

Run:
```bash
mkdir -p /Users/devrathore/Desktop/developement/problemTracker/backend/src/middleware
```

- [ ] **Step 2: Write `backend/src/middleware/notFound.middleware.js`**

```javascript
const notFound = (req, res, next) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
};

module.exports = notFound;
```

- [ ] **Step 3: Write `backend/src/middleware/error.middleware.js`**

```javascript
const { isProduction } = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = err.message || 'Internal Server Error';

  const body = {
    error: {
      message,
      status,
    },
  };

  if (!isProduction && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
};

module.exports = errorHandler;
```

- [ ] **Step 4: Verify both modules load**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && node -e "console.log(typeof require('./src/middleware/notFound.middleware'), typeof require('./src/middleware/error.middleware'))"
```
Expected: prints `function function`.

- [ ] **Step 5: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/src/middleware/notFound.middleware.js backend/src/middleware/error.middleware.js && git commit -m "feat(backend): add notFound and central error middleware"
```

---

## Task 6: Health controller and routes

**Files:**
- Create: `backend/src/controllers/health.controller.js`
- Create: `backend/src/routes/health.routes.js`
- Create: `backend/src/routes/index.js`

- [ ] **Step 1: Create `src/controllers/` and `src/routes/` directories**

Run:
```bash
mkdir -p /Users/devrathore/Desktop/developement/problemTracker/backend/src/controllers /Users/devrathore/Desktop/developement/problemTracker/backend/src/routes
```

- [ ] **Step 2: Write `backend/src/controllers/health.controller.js`**

```javascript
const prisma = require('../db/prisma');
const asyncHandler = require('../utils/asyncHandler');

const getHealth = asyncHandler(async (req, res) => {
  const payload = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: 'connected',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    payload.status = 'degraded';
    payload.db = 'disconnected';
    return res.status(503).json(payload);
  }

  return res.status(200).json(payload);
});

module.exports = { getHealth };
```

- [ ] **Step 3: Write `backend/src/routes/health.routes.js`**

```javascript
const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

router.get('/', getHealth);

module.exports = router;
```

- [ ] **Step 4: Write `backend/src/routes/index.js`**

```javascript
const express = require('express');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.use('/health', healthRoutes);

module.exports = router;
```

- [ ] **Step 5: Verify the router module loads**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && node -e "const r = require('./src/routes'); console.log(r && typeof r === 'function' ? 'router ok' : 'router missing')"
```
Expected: prints `router ok`.

- [ ] **Step 6: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/src/controllers/health.controller.js backend/src/routes/health.routes.js backend/src/routes/index.js && git commit -m "feat(backend): add /api/health endpoint with db reachability check"
```

---

## Task 7: Assemble Express app and server entrypoint

**Files:**
- Create: `backend/src/app.js`
- Create: `backend/src/server.js`
- Create: `backend/src/services/.gitkeep`

- [ ] **Step 1: Create `src/services/` placeholder**

Run:
```bash
mkdir -p /Users/devrathore/Desktop/developement/problemTracker/backend/src/services && touch /Users/devrathore/Desktop/developement/problemTracker/backend/src/services/.gitkeep
```

- [ ] **Step 2: Write `backend/src/app.js`**

```javascript
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { corsOrigin, nodeEnv } = require('./config/env');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 3: Write `backend/src/server.js`**

```javascript
const { port, nodeEnv } = require('./config/env');
const app = require('./app');
const prisma = require('./db/prisma');

const server = app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port} (${nodeEnv})`);
});

const shutdown = async (signal) => {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error('[server] error during prisma disconnect', err);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

- [ ] **Step 4: Sanity-check that `app.js` parses without runtime errors**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && node -e "const a = require('./src/app'); console.log(typeof a)"
```
Expected: prints `function` (Express app is a function).

- [ ] **Step 5: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/src/app.js backend/src/server.js backend/src/services/.gitkeep && git commit -m "feat(backend): assemble express app and server entrypoint"
```

---

## Task 8: Write `README.md`

**Files:**
- Create: `backend/README.md`

- [ ] **Step 1: Write `backend/README.md`**

```markdown
# problemTracker — Backend

Node + Express + Prisma + PostgreSQL backend for the Society Problem Tracker assignment.

## Prerequisites

- Node.js v20 LTS or newer
- PostgreSQL running locally (or a hosted instance) reachable via `DATABASE_URL`

## Setup

```bash
cd backend
npm install
cp .env.example .env
# edit DATABASE_URL in .env to match your local Postgres
npm run prisma:migrate
```

## Run

```bash
npm run dev   # nodemon, hot reload
# or
npm start     # plain node
```

Then verify:

```bash
curl http://localhost:4000/api/health
```

Expected JSON:

```json
{ "status": "ok", "uptime": 0.12, "timestamp": "...", "db": "connected" }
```

## Project Structure

```
backend/
├── prisma/                 # Prisma schema and migrations
└── src/
    ├── config/             # env loading + validation
    ├── controllers/        # request handlers
    ├── db/                 # PrismaClient singleton
    ├── middleware/         # cross-cutting middleware (errors, 404)
    ├── routes/             # route definitions, mounted at /api
    ├── services/           # business logic (added in next iteration)
    ├── utils/              # small helpers (e.g. asyncHandler)
    ├── app.js              # express app assembly
    └── server.js           # HTTP listener + graceful shutdown
```

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start server with `nodemon` |
| `npm start` | Start server with `node` |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Create + apply a new migration |
| `npm run prisma:studio` | Open Prisma Studio in the browser |

## Next Steps

Subsequent iterations will add:

1. Auth — Resident and Admin roles, JWT-based register/login.
2. Domain — Society, Problem models and CRUD endpoints.
3. Hardening — `helmet`, request validation, rate limiting, tests.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/devrathore/Desktop/developement/problemTracker && git add backend/README.md && git commit -m "docs(backend): add README with setup, run, and structure"
```

---

## Task 9: End-to-end verification

This task is **manual**. The developer (you) needs a running PostgreSQL instance with credentials matching `DATABASE_URL` in `backend/.env`. No commit at the end — purely verification.

- [ ] **Step 1: Confirm `.env` is filled in with a real `DATABASE_URL`**

Edit `backend/.env` so `DATABASE_URL` points to a PostgreSQL database you can write to (a local DB called `problem_tracker` is fine).

- [ ] **Step 2: Run the initial Prisma migration**

Run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npm run prisma:migrate -- --name init
```
Expected: prompts for migration name (or uses `init`); creates `prisma/migrations/<timestamp>_init/` and applies it. Final line includes `Your database is now in sync with your schema.`

- [ ] **Step 3: Start the dev server**

Run (in a foreground terminal — or use a background process; verification curls happen from another shell):
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npm run dev
```
Expected: log line `[server] listening on http://localhost:4000 (development)`.

- [ ] **Step 4: Curl the health endpoint (happy path)**

Run from a separate shell:
```bash
curl -s http://localhost:4000/api/health
```
Expected: JSON with `"status":"ok"`, `"db":"connected"`, a numeric `uptime`, and an ISO `timestamp`. HTTP 200.

- [ ] **Step 5: Curl an unknown route (404 path)**

Run:
```bash
curl -s -o /dev/stderr -w "%{http_code}\n" http://localhost:4000/api/does-not-exist
```
Expected: HTTP `404` and JSON body `{"error":{"message":"Route not found: GET /api/does-not-exist","status":404}}`.

- [ ] **Step 6: Verify CORS for the frontend origin**

Run:
```bash
curl -s -i -H "Origin: http://localhost:3000" http://localhost:4000/api/health | grep -i "access-control-allow-origin"
```
Expected: a header line `Access-Control-Allow-Origin: http://localhost:3000`.

- [ ] **Step 7: Verify DB-down behavior (optional but recommended)**

Stop your local PostgreSQL service (e.g. `brew services stop postgresql@16`), then:
```bash
curl -s -o /dev/stderr -w "%{http_code}\n" http://localhost:4000/api/health
```
Expected: HTTP `503` and JSON with `"status":"degraded"`, `"db":"disconnected"`. Server process should still be running. Restart PostgreSQL after the check.

- [ ] **Step 8: Verify startup fails when an env var is missing**

Stop the dev server. Remove one line (e.g. `PORT=4000`) from `backend/.env`, then run:
```bash
cd /Users/devrathore/Desktop/developement/problemTracker/backend && npm start 2>&1 | head -20
```
Expected: process exits non-zero with `Missing required environment variables: PORT. Copy backend/.env.example to backend/.env and fill in the values.` Restore the line and confirm the server starts again.

- [ ] **Step 9: Mark scaffold complete**

All eight verification steps above must pass. At that point the backend scaffold is ready for the next iteration (auth).

---

## Self-Review Notes

- **Spec coverage:** Every section of the spec (`Tech Stack`, `Folder Structure`, `Environment Variables`, `Prisma Schema`, `Health Endpoint Contract`, `Error Handling Contract`, `package.json Scripts`, `.gitignore`, `README`, `Verification Criteria`) maps to a numbered task above.
- **No placeholders:** Every code block is the complete file contents. No "TBD" / "similar to" / "add error handling" instructions.
- **Type consistency:** The `error.middleware` reads `err.status` / `err.message` — there's no other error shape produced in this iteration, so no consumer mismatch. `getHealth` returns the shape documented in the spec. `prisma` is imported as a default export everywhere it's used.
- **Commit cadence:** Eight commits across Tasks 1–8 (one per task), Task 9 is verification with no commit.
