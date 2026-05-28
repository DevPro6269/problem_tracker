# Society Problem Tracker — Auth & Domain Design

**Date**: 2026-05-29
**Status**: Draft (pending user review)
**Builds on**: `2026-05-28-society-problem-tracker-backend-scaffold-design.md`
**Scope**: Multi-tenant signup/login, role-based authorization, domain models (`Society`, `User`, `SocietyMember`, `Ticket`), and the ticket CRUD slice. AI complaint-intake agent is **deferred** to a follow-up spec.

## Context

The backend scaffold from the 2026-05-28 spec is complete: Express + Prisma + Postgres are running with a working `/api/health` endpoint, and the backend has since been migrated from JavaScript to TypeScript (`tsx watch`, `tsconfig.json`, `@types/*` installed). The frontend is a Next.js 16.2.6 + React 19.2.4 + TypeScript app, currently empty.

This spec lands the **product core**: multi-tenant societies with two roles (`ADMIN`, `RESIDENT`), phone+OTP auth, and ticket lifecycle CRUD. After this lands, residents will be able to log tickets via a plain form; the AI intake agent (deferred) will be layered on top of the same `POST /api/societies/:slug/tickets` endpoint.

## Product Overview

**SocietyDesk** *(working name)*. A multi-tenant SaaS where any housing society / RWA can spin up its own complaint portal in under a minute. Residents file issues; admins triage, assign, and resolve.

### Roles
| Role | Who | Capabilities |
| ---- | --- | ------------ |
| `ADMIN` | Society manager / RWA secretary | Manage all tickets in the society, assign to staff, change status. Cannot raise tickets. |
| `RESIDENT` | Anyone living in the society | Raise tickets, view only their own tickets, see status updates. |

A user belongs to a society via `SocietyMember`. A given user has exactly one role per society (enforced by `unique(userId, societyId)`).

### Core user flows
1. **Admin onboarding** — `/signup/society` → name, society name, address, phone → OTP screen → submit `123456` → `Society` + `User` + `SocietyMember(ADMIN)` created in one transaction → admin dashboard with auto-generated `joinCode` (e.g. `GV-A4F2`).
2. **Resident onboarding** — `/signup/resident` → join code, name, flat number, phone → OTP screen → submit `123456` → `User` + `SocietyMember(RESIDENT)` created → resident dashboard.
3. **Existing user login** — `/login` → phone → OTP screen → submit `123456` → JWT issued, redirect to first available society dashboard.
4. **Resident files a ticket** *(form-only path for this iteration; AI chat layered on later)* — `/s/:slug/resident/tickets/new` → form (title, description, category, priority, location) → submit → ticket persisted with `status = OPEN`.
5. **Admin handles a ticket** — `/s/:slug/admin` → Kanban board (Open / In Progress / Resolved / Closed) → open ticket → edit `assignedTo`, `internalNote`, change `status`.

## Goals

1. Phone+OTP auth using a fixed dev OTP (`123456`) — no SMS provider.
2. Two-step signup flows for admin and resident; a single login flow for existing users.
3. JWT issuance with `userId` + embedded memberships claim; verified by middleware on protected routes.
4. Three-layer tenant isolation: JWT payload, `tenantGuard` middleware, tenant-scoped Prisma helper.
5. Full ticket CRUD with status transitions, scoped to society and (for residents) creator.
6. A working frontend that exercises every endpoint end-to-end.
7. Deployment: frontend on Vercel, backend on Railway or Render, database on Neon.

## Non-Goals

- Real SMS / OTP provider (Twilio, MSG91, etc.). Fixed OTP is intentional.
- AI complaint-intake agent (chat-to-ticket extraction). Designed in a follow-up spec.
- Voice input. Not in this iteration.
- Email login or email-based contact at all. `User.phone` is the sole identifier.
- Password storage. There are no passwords anywhere in the system.
- `ChatMessage` table or any persisted chat history.
- Photo / file attachments on tickets.
- `aiSummary` field on `Ticket`.
- Notification system (email, SMS, push). Status updates surface only on next page load.
- Real-time updates (WebSockets, SSE). Plain polling / refresh.
- Custom subdomains (`gv.societydesk.app`). Path-based tenancy only.
- Postgres Row-Level Security policies. App-layer isolation only.
- `Staff` table. `Ticket.assignedTo` is a free-text string for MVP.
- Regenerable `joinCode`. One-time, fixed on society creation.
- Multi-society "super admin" role.
- Billing, subscriptions, tenant tiers.
- Audit log / status history table. `updatedAt` is sufficient.

## Tech Stack (additions over scaffold)

| Concern | Choice |
| ------- | ------ |
| Backend language | **TypeScript** (already migrated) |
| Auth library | `jsonwebtoken` (HS256) |
| Phone validation | `libphonenumber-js` (normalize to E.164) |
| Schema validation | `zod` (request bodies + AI extraction later) |
| Testing | `vitest` + `supertest` |
| Frontend UI | shadcn/ui on Tailwind (Radix primitives) |
| Frontend forms | `react-hook-form` + `zod` |
| Frontend HTTP | native `fetch` wrapped in a small `apiClient` |
| AI provider *(later)* | Groq (Llama 3.3 70B), via Vercel AI SDK `ai` package — out of scope for this spec |
| Deployment (frontend) | Vercel |
| Deployment (backend) | Railway (free tier) |
| Deployment (DB) | Neon Postgres |
| CI | GitHub Actions — install / typecheck / lint / backend tests on PR |

## Data Model

### `Society` *(tenant root)*
| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `cuid` | PK |
| `name` | `string` | Display name |
| `slug` | `string @unique` | URL slug, derived from name on creation (lowercase kebab). On collision, append a 4-char random suffix and retry up to 3 times. |
| `joinCode` | `string @unique` | e.g. `GV-A4F2`, generated on creation, immutable |
| `address` | `string?` | Optional |
| `createdAt` | `DateTime @default(now())` | |

### `User` *(global, not tenant-scoped)*
| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `cuid` | PK |
| `phone` | `string @unique` | E.164 format, e.g. `+919876543210` |
| `name` | `string` | |
| `createdAt` | `DateTime @default(now())` | |

A user can belong to multiple societies via multiple `SocietyMember` rows.

### `SocietyMember` *(user ↔ society + role)*
| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `cuid` | PK |
| `userId` | `string` | FK → `User.id` |
| `societyId` | `string` | FK → `Society.id` |
| `role` | `enum (ADMIN \| RESIDENT)` | |
| `flatNumber` | `string?` | Required UX-wise for residents, null for admins |
| `createdAt` | `DateTime @default(now())` | |
| **unique** | `(userId, societyId)` | One role per (user, society) pair |

### `Ticket`
| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | `cuid` | PK |
| `societyId` | `string` | FK → `Society.id`. Tenant key. |
| `createdById` | `string` | FK → `User.id`. Must reference a user with a `RESIDENT` membership in `societyId` (enforced in app layer at create time). |
| `title` | `string` | 5–120 chars |
| `description` | `string` | 10–2000 chars |
| `category` | `enum` | `ELEVATOR \| PLUMBING \| ELECTRICAL \| SECURITY \| CLEANLINESS \| PARKING \| OTHER` |
| `priority` | `enum` | `LOW \| MEDIUM \| HIGH \| URGENT` (default `MEDIUM`) |
| `status` | `enum` | `OPEN \| IN_PROGRESS \| RESOLVED \| CLOSED` (default `OPEN`) |
| `location` | `string?` | ≤100 chars, e.g. "3rd Floor", "Block A Lobby" |
| `assignedTo` | `string?` | Free-text staff name |
| `internalNote` | `string?` | Admin-only notes |
| `createdAt` | `DateTime @default(now())` | |
| `updatedAt` | `DateTime @updatedAt` | |
| **index** | `(societyId, status)` | Fast Kanban queries |

### Enums
```prisma
enum Role         { ADMIN RESIDENT }
enum TicketCategory { ELEVATOR PLUMBING ELECTRICAL SECURITY CLEANLINESS PARKING OTHER }
enum TicketPriority { LOW MEDIUM HIGH URGENT }
enum TicketStatus   { OPEN IN_PROGRESS RESOLVED CLOSED }
```

## Multi-Tenancy Strategy

Path-based tenancy on the frontend (`/s/[slug]/...`) and the backend (`/api/societies/:slug/...`). Defense in depth with three layers:

### Layer 1 — JWT payload
On successful OTP verification, the backend issues a JWT containing:
```json
{
  "userId": "user_cuid",
  "memberships": [
    { "societyId": "society_cuid", "slug": "green-valley", "role": "ADMIN" }
  ],
  "iat": "...",
  "exp": "..."
}
```
Expiry: 7 days. Signed with `JWT_SECRET` from env. Algorithm: HS256.

### Layer 2 — Express middleware
Three middlewares, composed per route:

```ts
// authGuard: verifies JWT, attaches req.user
// tenantGuard: matches :slug to a membership, attaches req.society
// requireRole(role): checks req.society.role === role
```

Pseudocode for `tenantGuard`:
```ts
function tenantGuard(req, res, next) {
  const { slug } = req.params;
  const m = req.user.memberships.find(m => m.slug === slug);
  if (!m) return res.status(403).json({ error: { message: "Not a member of this society", status: 403 } });
  req.society = { id: m.societyId, slug: m.slug, role: m.role };
  next();
}
```

After `tenantGuard`, `req.society.id` is trusted and used as the tenant key for every downstream query.

### Layer 3 — Tenant-scoped Prisma helper
A wrapper around `PrismaClient` that auto-injects `societyId` on every operation it exposes:

```ts
export function prismaFor(societyId: string) {
  return {
    ticket: {
      findMany: (args) => prisma.ticket.findMany({ ...args, where: { ...args.where, societyId } }),
      findUnique: async (args) => {
        const t = await prisma.ticket.findUnique(args);
        return t?.societyId === societyId ? t : null;
      },
      create: (args) => prisma.ticket.create({ ...args, data: { ...args.data, societyId } }),
      update: (args) => prisma.ticket.update({ ...args, where: { ...args.where, societyId } }),
      delete: (args) => prisma.ticket.delete({ ...args, where: { ...args.where, societyId } }),
    },
    societyMember: { /* same pattern */ },
  };
}
```

Controllers call `const db = prismaFor(req.society.id)` then `db.ticket.findMany(...)`. The bare `PrismaClient` is only used in auth/signup endpoints (which haven't yet resolved a tenant).

### Resident scoping
Resident endpoints add a second filter on `createdById`:
```ts
db.ticket.findMany({ where: { createdById: req.user.id } });
```
Admin endpoints don't add this filter — they see all tickets in their society.

## Auth Flow

### Endpoints
```
POST /api/auth/send-otp
  Body: { phone: string }
  Behavior: validates phone (E.164), returns instantly. No SMS, no storage.
  Response: { sent: true }

POST /api/auth/verify-otp
  Body: { phone, otp, mode, ...extraFields }
    mode: "login" | "register-admin" | "register-resident"
    register-admin extra: { name, societyName, address? }
    register-resident extra: { name, flatNumber, joinCode }
  Behavior:
    - If otp !== "123456" → 401
    - mode=login: look up User by phone → 404 if not found → issue JWT
    - mode=register-admin: create Society + User + SocietyMember(ADMIN) in one tx → issue JWT
    - mode=register-resident: look up Society by joinCode → create User + SocietyMember(RESIDENT) in one tx → issue JWT
    - Phone collision (existing user on register): 409 with clear message
  Response: { token: string, user: { id, name, phone, memberships: [...] } }

GET /api/me
  Headers: Authorization: Bearer <token>
  Response: { user: { id, name, phone, memberships: [...] } }
```

### Demo OTP disclosure
The login screen, both signup screens, and the README all display: *"Demo OTP: 123456"*. Reviewers can sign in without external dependencies.

## API Surface (post-auth)

All routes below require `authGuard` + `tenantGuard`. Role enforcement noted per route.

```
GET    /api/societies/:slug                   [admin or resident]   → society info + my role
GET    /api/societies/:slug/tickets           [ADMIN]               → all tickets in society
GET    /api/societies/:slug/tickets/mine      [RESIDENT]            → only tickets where createdById = req.user.id
GET    /api/societies/:slug/tickets/:id       [ADMIN or RESIDENT*]  → single ticket  (*resident: only own)
POST   /api/societies/:slug/tickets           [RESIDENT]            → create ticket (Zod-validated body)
PATCH  /api/societies/:slug/tickets/:id       [ADMIN]               → update status, assignedTo, internalNote
```

Query params on the admin list endpoint:
- `?status=OPEN,IN_PROGRESS` — filter by one or more statuses
- `?category=ELEVATOR` — filter by category

### Request/response shapes (representative)

```
POST /api/societies/green-valley/tickets
  Body:
    { title, description, category, priority?, location? }
  Response 201:
    { ticket: { id, title, ..., status: "OPEN", createdAt } }

PATCH /api/societies/green-valley/tickets/<id>
  Body (any subset):
    { status?, assignedTo?, internalNote? }
  Response 200:
    { ticket: { ...updated } }
```

## Frontend Structure (Next.js 16)

```
src/app/
├── page.tsx                          public landing
├── login/page.tsx                    phone → OTP → JWT
├── signup/
│   ├── society/page.tsx              admin signup
│   └── resident/page.tsx             resident signup (joinCode)
└── s/[slug]/
    ├── layout.tsx                    sidebar, society name in header, footer (assignment req.)
    ├── admin/
    │   ├── page.tsx                  Kanban dashboard
    │   └── tickets/[id]/page.tsx     ticket detail + edit form
    └── resident/
        ├── page.tsx                  "My Issues" list + status badges
        └── tickets/new/page.tsx      ticket creation form (AI chat slot replaces this later)
```

- JWT in `localStorage`. A small `apiClient` reads it and sets `Authorization`.
- On 401 from any endpoint: redirect to `/login`.
- On 403: render a friendly "you don't have access to this society" page.

### Footer (assignment requirement)
A single `<Footer />` component in `s/[slug]/layout.tsx` and on the landing page, containing: developer name, GitHub profile link, LinkedIn profile link.

## Testing

Minimal, focused on the tenant-isolation surface — that's where security bugs hide.

| Layer | Tool | Coverage |
| ----- | ---- | -------- |
| Unit | Vitest | `prismaFor` helper (injects `societyId` and ignores attempts to override it); `authGuard` (rejects missing/invalid/expired tokens); `tenantGuard` (rejects when user isn't a member); slug + joinCode generators (uniqueness, format); E.164 normalization |
| Integration | Vitest + supertest | One happy-path: admin registers society → resident registers with code → resident creates ticket → admin lists tickets → admin updates status. Plus one cross-tenant negative test: User A in Society X cannot read tickets from Society Y. |
| Frontend | none | Manual demo |
| E2E | none | Out of scope |

Tests run against a separate `problem_tracker_test` Postgres DB. `prisma migrate reset` is invoked once before the suite.

## Deployment

| Piece | Service | Notes |
| ----- | ------- | ----- |
| Frontend | Vercel | Auto-deploys on push to `main`. Env: `NEXT_PUBLIC_API_URL`. |
| Backend | Railway | Auto-deploys on push to `main`. Env: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV`. |
| Database | Neon (Postgres free tier) | Single instance, no branching. |

### CI/CD
GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every PR and push to `main`:
1. Checkout, setup Node 20
2. Install dependencies in `backend/` and `frontend/`
3. `tsc --noEmit` in both
4. `eslint` in `frontend/`
5. `vitest run` in `backend/`

Vercel and Railway handle deploys on push to `main` independently — no manual deploy step.

### Environment variable additions over scaffold
Backend:
```
JWT_SECRET=<random 64-byte hex>
GROQ_API_KEY=<reserved for AI iteration — unused this iteration>
```
Frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:4000   (local)
NEXT_PUBLIC_API_URL=https://<backend>.railway.app   (prod)
```

## Verification Criteria

After implementation lands, all of the following must hold:

1. `POST /api/auth/send-otp` accepts any valid E.164 phone and returns `{ sent: true }` in <100ms.
2. `POST /api/auth/verify-otp` with `otp !== "123456"` returns 401 regardless of mode.
3. `POST /api/auth/verify-otp` with `mode=register-admin` and a fresh phone creates `Society` + `User` + `SocietyMember(ADMIN)` atomically; partial rows on failure are impossible (Prisma transaction).
4. `POST /api/auth/verify-otp` with `mode=register-resident` and an invalid `joinCode` returns 404 with a clear message.
5. Re-registering with the same phone returns 409.
6. A valid JWT decodes to a payload containing `userId` and a populated `memberships` array.
7. Hitting `/api/societies/:slug/tickets` without a JWT returns 401.
8. Hitting `/api/societies/foreign-slug/tickets` with a valid JWT for a different society returns 403 (not 200, not 404).
9. A resident hitting an `ADMIN`-only endpoint returns 403.
10. A resident calling `GET /tickets/mine` only sees tickets where `createdById = req.user.id` — confirmed by seeding two residents in the same society.
11. A resident in Society X cannot fetch a ticket from Society Y by guessing its ID — returns 403 (because tenant guard fails before the query).
12. Admin can transition a ticket through `OPEN → IN_PROGRESS → RESOLVED → CLOSED`.
13. Frontend sign-in flow works end-to-end against the deployed backend.
14. Every page renders the required footer (name, GitHub, LinkedIn).
15. CI green on a PR that introduces a deliberate typecheck error → red. Reverting → green.

## Out of Scope / Future Iterations

The following are deferred to follow-up specs:

- **AI complaint-intake agent.** Streaming chat endpoint that uses Groq (Llama 3.3 70B) via Vercel AI SDK to gather complaint details from a resident and extract a structured `TicketDraft` validated by a shared Zod schema. Will replace `tickets/new` form as the primary creation path; the form stays as a fallback.
- **Voice input.** Browser-native Web Speech API on the resident chat page.
- **Photo attachments.** Cloudinary unsigned upload widget.
- **Notifications.** Email or in-app on status changes.
- **Audit / status history.** Per-status-change row stored in a `TicketEvent` table.
- **Real SMS OTP.** Drop in MSG91 or Twilio behind a `OtpProvider` interface.
- **Subdomain tenancy.** Migration path from `/s/:slug/...` to `:slug.societydesk.app`.
