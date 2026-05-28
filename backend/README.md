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
npm run dev    # nodemon, hot reload
# or
npm start      # plain node
```

Then verify:

```bash
curl http://localhost:4000/api/health
```

Expected JSON when Postgres is reachable:

```json
{ "status": "ok", "uptime": 0.12, "timestamp": "...", "db": "connected" }
```

If Postgres is unreachable, the endpoint returns HTTP 503 with `"status": "degraded"` and `"db": "disconnected"` — the server itself stays up.

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

1. **Auth** — Resident and Admin roles, JWT-based register/login.
2. **Domain** — Society, Problem models and CRUD endpoints.
3. **Hardening** — `helmet`, request validation, rate limiting, tests.
