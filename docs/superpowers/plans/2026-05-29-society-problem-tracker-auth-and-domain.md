# Society Problem Tracker — Auth & Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer phone+OTP auth, multi-tenant isolation, ticket CRUD, a Next.js 16 frontend, and a CI+deployment pipeline on top of the existing Express+Prisma+Postgres scaffold so the assignment ships end-to-end.

**Architecture:** Express backend issues JWTs that embed memberships; every tenant-scoped endpoint passes through `authGuard → tenantGuard → requireRole`, then queries through a `prismaFor(societyId)` wrapper that physically cannot omit the `WHERE societyId = ?` filter. Next.js 16 frontend with shadcn/ui calls REST endpoints via a small `apiClient`. Frontend → Vercel, backend → Railway, DB → Neon.

**Tech Stack:** Backend — Node 20 + Express 5 + TypeScript + Prisma + Postgres + `jsonwebtoken` + `zod` + `libphonenumber-js` + Vitest + supertest. Frontend — Next.js 16.2 + React 19 + TypeScript + Tailwind + shadcn/ui + `react-hook-form` + `zod`.

**Spec reference:** `docs/superpowers/specs/2026-05-29-society-problem-tracker-auth-and-domain-design.md`

---

## Prerequisites (one-time, manual)

Before starting Task 1, do these once:

1. Create two local Postgres databases:
   ```bash
   createdb problem_tracker
   createdb problem_tracker_test
   ```
   (Or use any Postgres GUI — names must match `.env`.)

2. Generate a `JWT_SECRET` and put it in `backend/.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Append the result to `backend/.env`:
   ```
   JWT_SECRET=<paste here>
   TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/problem_tracker_test?schema=public
   ```

3. Ensure `frontend/.env.local` contains:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

## File Structure

### Backend (`backend/`)
```
prisma/
  schema.prisma                       MODIFY — replace HealthPing with full domain
src/
  config/
    env.ts                            MODIFY — add JWT_SECRET, TEST_DATABASE_URL
  db/
    prisma.ts                         (unchanged)
    tenantPrisma.ts                   CREATE — society-scoped Prisma wrapper
  utils/
    asyncHandler.ts                   (unchanged)
    phone.ts                          CREATE — E.164 normalization
    slug.ts                           CREATE — slug + joinCode generators
    jwt.ts                            CREATE — sign/verify JWT
  schemas/
    auth.schemas.ts                   CREATE — Zod schemas for auth bodies
    ticket.schemas.ts                 CREATE — Zod schemas for ticket bodies
  middleware/
    error.middleware.ts               (unchanged)
    notFound.middleware.ts            (unchanged)
    authGuard.ts                      CREATE — verify JWT, attach req.user
    tenantGuard.ts                    CREATE — match slug, attach req.society
    requireRole.ts                    CREATE — role check
    validateBody.ts                   CREATE — Zod request body validator
  services/
    authService.ts                    CREATE — OTP verify, register flows
    ticketService.ts                  CREATE — ticket CRUD logic
  controllers/
    auth.controller.ts                CREATE
    me.controller.ts                  CREATE
    ticket.controller.ts              CREATE
    society.controller.ts             CREATE
  routes/
    auth.routes.ts                    CREATE
    me.routes.ts                      CREATE
    society.routes.ts                 CREATE — mounts ticket routes under /:slug
    ticket.routes.ts                  CREATE
    index.ts                          MODIFY — mount new routes
  types/
    express.d.ts                      CREATE — augment Request with user/society
  app.ts                              (unchanged)
  server.ts                           (unchanged)
tests/
  setup.ts                            CREATE — load .env.test, reset DB
  helpers.ts                          CREATE — make user/society/ticket factories
  unit/
    phone.test.ts                     CREATE
    slug.test.ts                      CREATE
    jwt.test.ts                       CREATE
    tenantPrisma.test.ts              CREATE
    authGuard.test.ts                 CREATE
    tenantGuard.test.ts               CREATE
  integration/
    auth.test.ts                      CREATE
    ticket-happy-path.test.ts         CREATE
    cross-tenant.test.ts              CREATE
vitest.config.ts                      CREATE
.env.example                          MODIFY — JWT_SECRET, TEST_DATABASE_URL
package.json                          MODIFY — deps, test scripts
```

### Frontend (`frontend/`)
```
src/
  app/
    layout.tsx                        MODIFY — root layout, Tailwind, Footer
    page.tsx                          MODIFY — landing page
    globals.css                       MODIFY — Tailwind directives
    login/page.tsx                    CREATE
    signup/society/page.tsx           CREATE
    signup/resident/page.tsx          CREATE
    s/[slug]/layout.tsx               CREATE — society shell, role-aware sidebar
    s/[slug]/admin/page.tsx           CREATE — Kanban dashboard
    s/[slug]/admin/tickets/[id]/page.tsx  CREATE — ticket detail+edit
    s/[slug]/resident/page.tsx        CREATE — My Issues list
    s/[slug]/resident/tickets/new/page.tsx CREATE — create-ticket form
  components/
    Footer.tsx                        CREATE
    OtpStep.tsx                       CREATE — shared OTP entry sub-form
    TicketCard.tsx                    CREATE
    StatusBadge.tsx                   CREATE
    ui/                               CREATE — shadcn components copied in
  lib/
    apiClient.ts                      CREATE — fetch wrapper + auth header
    auth.ts                           CREATE — localStorage helpers
    types.ts                          CREATE — shared response shapes
tailwind.config.ts                    CREATE
postcss.config.mjs                    CREATE
components.json                       CREATE — shadcn config
.env.local                            (manual)
package.json                          MODIFY — deps
```

### Repo root
```
.github/workflows/ci.yml              CREATE
```

---

# Phase 1 — Backend Foundation

## Task 1: Install backend deps, add JWT_SECRET + TEST_DATABASE_URL, set up Vitest

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/config/env.ts`
- Modify: `backend/.env.example`
- Create: `backend/vitest.config.ts`
- Create: `backend/tests/setup.ts`

- [ ] **Step 1: Install runtime + dev deps**

```bash
cd backend
npm install jsonwebtoken libphonenumber-js zod bcryptjs
npm install -D vitest supertest @types/jsonwebtoken @types/supertest @types/bcryptjs
```

(`bcryptjs` is unused for now but reserved for potential password fallback; safe to omit if you prefer.)

- [ ] **Step 2: Replace `src/config/env.ts`**

Replace `REQUIRED` and the config block to include `JWT_SECRET` and optional `TEST_DATABASE_URL`:

```ts
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['PORT', 'NODE_ENV', 'DATABASE_URL', 'CORS_ORIGIN', 'JWT_SECRET'] as const;

const missing = REQUIRED.filter((key) => {
  const value = process.env[key];
  return !value || value.trim() === '';
});

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      `Copy backend/.env.example to backend/.env and fill in the values.`,
  );
}

const port = Number.parseInt(process.env.PORT as string, 10);
if (Number.isNaN(port)) {
  throw new Error(`PORT must be a number, got "${process.env.PORT}"`);
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  corsOrigin: string;
  jwtSecret: string;
  testDatabaseUrl: string | undefined;
  isProduction: boolean;
  isTest: boolean;
}

export const config: AppConfig = {
  port,
  nodeEnv: process.env.NODE_ENV as string,
  databaseUrl: process.env.DATABASE_URL as string,
  corsOrigin: process.env.CORS_ORIGIN as string,
  jwtSecret: process.env.JWT_SECRET as string,
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

export default config;
```

- [ ] **Step 3: Update `backend/.env.example`**

```
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/problem_tracker?schema=public
TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/problem_tracker_test?schema=public
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=replace-me-with-64-bytes-of-hex
```

- [ ] **Step 4: Create `backend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',          // serialize DB tests
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 15000,
    globals: false,
  },
});
```

- [ ] **Step 5: Create `backend/tests/setup.ts`**

```ts
import { execSync } from 'node:child_process';
import { config } from '../src/config/env.js';

if (!config.testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL must be set when running tests');
}

// Point Prisma at the test DB for the whole suite
process.env.DATABASE_URL = config.testDatabaseUrl;

// Reset schema once before the suite (safe + fast for small schemas)
execSync('npx prisma migrate reset --force --skip-seed', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: config.testDatabaseUrl },
});
```

- [ ] **Step 6: Add scripts to `backend/package.json`**

Add inside `"scripts"`:

```json
"test": "NODE_ENV=test vitest run",
"test:watch": "NODE_ENV=test vitest"
```

- [ ] **Step 7: Sanity check — typecheck passes**

```bash
cd backend
npm run typecheck
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/config/env.ts \
        backend/.env.example backend/vitest.config.ts backend/tests/setup.ts
git commit -m "feat(backend): add JWT_SECRET, install auth/test deps, set up Vitest"
```

---

## Task 2: Define full Prisma schema and migrate

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Creates: `backend/prisma/migrations/<timestamp>_init_domain/`

- [ ] **Step 1: Replace `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  RESIDENT
}

enum TicketCategory {
  ELEVATOR
  PLUMBING
  ELECTRICAL
  SECURITY
  CLEANLINESS
  PARKING
  OTHER
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model Society {
  id        String          @id @default(cuid())
  name      String
  slug      String          @unique
  joinCode  String          @unique
  address   String?
  createdAt DateTime        @default(now())

  members   SocietyMember[]
  tickets   Ticket[]
}

model User {
  id        String          @id @default(cuid())
  phone     String          @unique
  name      String
  createdAt DateTime        @default(now())

  members   SocietyMember[]
  tickets   Ticket[]        @relation("TicketCreator")
}

model SocietyMember {
  id         String   @id @default(cuid())
  userId     String
  societyId  String
  role       Role
  flatNumber String?
  createdAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  society Society @relation(fields: [societyId], references: [id], onDelete: Cascade)

  @@unique([userId, societyId])
  @@index([societyId, role])
}

model Ticket {
  id            String          @id @default(cuid())
  societyId     String
  createdById   String
  title         String
  description   String
  category      TicketCategory
  priority      TicketPriority  @default(MEDIUM)
  status        TicketStatus    @default(OPEN)
  location      String?
  assignedTo    String?
  internalNote  String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  society   Society @relation(fields: [societyId], references: [id], onDelete: Cascade)
  createdBy User    @relation("TicketCreator", fields: [createdById], references: [id])

  @@index([societyId, status])
  @@index([createdById])
}
```

- [ ] **Step 2: Drop the placeholder `HealthPing` migration history**

```bash
cd backend
rm -rf prisma/migrations
```
(We rebuild a clean initial migration in the next step.)

- [ ] **Step 3: Recreate the dev database and create the new initial migration**

```bash
cd backend
npx prisma migrate reset --force --skip-seed   # wipes problem_tracker (dev DB)
npx prisma migrate dev --name init_domain
```
Expected: a new `prisma/migrations/<ts>_init_domain/migration.sql` is created and applied.

- [ ] **Step 4: Verify schema is applied**

```bash
npx prisma studio
```
Open in browser; confirm `Society`, `User`, `SocietyMember`, `Ticket` tables exist. Close Studio.

- [ ] **Step 5: Update health controller — drop HealthPing reference if any**

Inspect `backend/src/controllers/health.controller.ts`. If it imports or queries `HealthPing`, replace that line with a simple raw query:

```ts
await prisma.$queryRaw`SELECT 1`;
```

- [ ] **Step 6: Run dev server to confirm it still boots**

```bash
npm run dev
```
In another shell:
```bash
curl http://localhost:4000/api/health
```
Expected: 200 with `db: "connected"`. Kill the server.

- [ ] **Step 7: Commit**

```bash
git add backend/prisma backend/src/controllers/health.controller.ts
git commit -m "feat(backend): replace placeholder schema with Society/User/SocietyMember/Ticket"
```

---

## Task 3: Phone normalization util (TDD)

**Files:**
- Create: `backend/src/utils/phone.ts`
- Create: `backend/tests/unit/phone.test.ts`

- [ ] **Step 1: Write failing test**

`backend/tests/unit/phone.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../../src/utils/phone.js';

describe('normalizePhone', () => {
  it('canonicalizes Indian numbers to E.164', () => {
    expect(normalizePhone('9876543210', 'IN')).toBe('+919876543210');
    expect(normalizePhone('+91 98765 43210', 'IN')).toBe('+919876543210');
    expect(normalizePhone('+919876543210', 'IN')).toBe('+919876543210');
  });

  it('throws on invalid input', () => {
    expect(() => normalizePhone('not-a-phone', 'IN')).toThrow(/invalid phone/i);
    expect(() => normalizePhone('123', 'IN')).toThrow(/invalid phone/i);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
cd backend
npm test -- phone
```
Expected: FAIL — `normalizePhone` not found.

- [ ] **Step 3: Implement `backend/src/utils/phone.ts`**

```ts
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export function normalizePhone(input: string, defaultCountry: CountryCode = 'IN'): string {
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    throw new Error(`Invalid phone number: ${input}`);
  }
  return parsed.number; // E.164 string, e.g. "+919876543210"
}
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
npm test -- phone
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/phone.ts backend/tests/unit/phone.test.ts
git commit -m "feat(backend): add E.164 phone normalization util"
```

---

## Task 4: Slug + joinCode generators (TDD)

**Files:**
- Create: `backend/src/utils/slug.ts`
- Create: `backend/tests/unit/slug.test.ts`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/slug.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { slugify, makeJoinCode } from '../../src/utils/slug.js';

describe('slugify', () => {
  it('lowercase-kebabs spaces', () => {
    expect(slugify('Green Valley Apartments')).toBe('green-valley-apartments');
  });

  it('strips non-alphanumerics', () => {
    expect(slugify('Sai Krupa #2 (Phase-1)!')).toBe('sai-krupa-2-phase-1');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugify('   --hello--   ')).toBe('hello');
  });
});

describe('makeJoinCode', () => {
  it('returns SLUGPREFIX-XXXX format using uppercase A–Z and digits', () => {
    const code = makeJoinCode('green-valley');
    expect(code).toMatch(/^GV-[A-Z0-9]{4}$/);
  });

  it('handles single-word slugs by repeating the first letter', () => {
    const code = makeJoinCode('sunrise');
    expect(code).toMatch(/^SU-[A-Z0-9]{4}$/);
  });

  it('produces different codes across calls', () => {
    const a = makeJoinCode('green-valley');
    const b = makeJoinCode('green-valley');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- slug
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `backend/src/utils/slug.ts`**

```ts
import { randomBytes } from 'node:crypto';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function randomChars(n: number): string {
  const bytes = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

function prefixFor(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  const first = parts[0] ?? 'XX';
  return (first.slice(0, 2) || 'XX').toUpperCase().padEnd(2, 'X');
}

export function makeJoinCode(slug: string): string {
  return `${prefixFor(slug)}-${randomChars(4)}`;
}
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
npm test -- slug
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/slug.ts backend/tests/unit/slug.test.ts
git commit -m "feat(backend): add slugify + makeJoinCode utils"
```

---

## Task 5: JWT sign/verify util (TDD)

**Files:**
- Create: `backend/src/utils/jwt.ts`
- Create: `backend/tests/unit/jwt.test.ts`

- [ ] **Step 1: Write failing test**

`backend/tests/unit/jwt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { signSession, verifySession, type SessionPayload } from '../../src/utils/jwt.js';

const payload: SessionPayload = {
  userId: 'u1',
  memberships: [{ societyId: 's1', slug: 'green-valley', role: 'ADMIN' }],
};

describe('jwt session', () => {
  it('signs and verifies a payload', () => {
    const token = signSession(payload);
    expect(typeof token).toBe('string');
    const decoded = verifySession(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.memberships).toEqual(payload.memberships);
  });

  it('throws on tampered token', () => {
    const token = signSession(payload);
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(() => verifySession(tampered)).toThrow();
  });

  it('throws on garbage', () => {
    expect(() => verifySession('not-a-jwt')).toThrow();
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```bash
npm test -- jwt
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `backend/src/utils/jwt.ts`**

```ts
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export type MembershipClaim = {
  societyId: string;
  slug: string;
  role: 'ADMIN' | 'RESIDENT';
};

export type SessionPayload = {
  userId: string;
  memberships: MembershipClaim[];
};

const EXPIRY = '7d';

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256', expiresIn: EXPIRY });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & SessionPayload;
  if (!decoded.userId || !Array.isArray(decoded.memberships)) {
    throw new Error('Invalid session payload');
  }
  return { userId: decoded.userId, memberships: decoded.memberships };
}
```

- [ ] **Step 4: Run test, confirm it passes**

```bash
npm test -- jwt
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/jwt.ts backend/tests/unit/jwt.test.ts
git commit -m "feat(backend): add JWT sign/verify util with memberships claim"
```

---

# Phase 2 — Tenant Isolation Surface

## Task 6: Augment Express Request type

**Files:**
- Create: `backend/src/types/express.d.ts`
- Modify: `backend/tsconfig.json`

- [ ] **Step 1: Create the type augmentation**

`backend/src/types/express.d.ts`:
```ts
import type { MembershipClaim, SessionPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
      society?: {
        id: string;
        slug: string;
        role: MembershipClaim['role'];
      };
    }
  }
}

export {};
```

- [ ] **Step 2: Include the types dir in tsconfig**

In `backend/tsconfig.json`, change `"include"`:
```json
"include": ["src/**/*.ts", "src/**/*.d.ts"]
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/types/express.d.ts backend/tsconfig.json
git commit -m "feat(backend): augment Express Request with user + society"
```

---

## Task 7: Tenant-scoped Prisma helper (TDD)

This is the security-critical core. Tests must prove it cannot be bypassed.

**Files:**
- Create: `backend/src/db/tenantPrisma.ts`
- Create: `backend/tests/helpers.ts`
- Create: `backend/tests/unit/tenantPrisma.test.ts`

- [ ] **Step 1: Create test helpers**

`backend/tests/helpers.ts`:
```ts
import prisma from '../src/db/prisma.js';
import { Role, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

let counter = 0;
const uniq = () => `${Date.now()}-${++counter}`;

export async function makeSociety(overrides: Partial<{ name: string; slug: string; joinCode: string }> = {}) {
  const id = uniq();
  return prisma.society.create({
    data: {
      name: overrides.name ?? `Society ${id}`,
      slug: overrides.slug ?? `society-${id}`,
      joinCode: overrides.joinCode ?? `SC-${id.slice(-4)}`,
    },
  });
}

export async function makeUser(overrides: Partial<{ name: string; phone: string }> = {}) {
  const id = uniq();
  return prisma.user.create({
    data: {
      name: overrides.name ?? `User ${id}`,
      phone: overrides.phone ?? `+91900000${id.slice(-4).padStart(4, '0')}`,
    },
  });
}

export async function makeMember(userId: string, societyId: string, role: Role, flatNumber?: string) {
  return prisma.societyMember.create({ data: { userId, societyId, role, flatNumber: flatNumber ?? null } });
}

export async function makeTicket(societyId: string, createdById: string, overrides: Partial<{ title: string; description: string; category: TicketCategory; priority: TicketPriority; status: TicketStatus }> = {}) {
  return prisma.ticket.create({
    data: {
      societyId,
      createdById,
      title: overrides.title ?? 'Test ticket',
      description: overrides.description ?? 'Test description',
      category: overrides.category ?? TicketCategory.OTHER,
      priority: overrides.priority ?? TicketPriority.MEDIUM,
      status: overrides.status ?? TicketStatus.OPEN,
    },
  });
}

export async function resetDb() {
  await prisma.ticket.deleteMany();
  await prisma.societyMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.society.deleteMany();
}
```

- [ ] **Step 2: Write failing tests**

`backend/tests/unit/tenantPrisma.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prismaFor } from '../../src/db/tenantPrisma.js';
import prisma from '../../src/db/prisma.js';
import { makeSociety, makeUser, makeMember, makeTicket, resetDb } from '../helpers.js';
import { Role } from '@prisma/client';

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

describe('prismaFor', () => {
  it('findMany only returns tickets for the scoped society', async () => {
    const a = await makeSociety();
    const b = await makeSociety();
    const u = await makeUser();
    await makeMember(u.id, a.id, Role.RESIDENT);
    await makeMember(u.id, b.id, Role.RESIDENT);
    await makeTicket(a.id, u.id, { title: 'A1' });
    await makeTicket(b.id, u.id, { title: 'B1' });

    const dbA = prismaFor(a.id);
    const found = await dbA.ticket.findMany({});
    expect(found.map((t) => t.title)).toEqual(['A1']);
  });

  it('findMany ignores attempts to override societyId in the where clause', async () => {
    const a = await makeSociety();
    const b = await makeSociety();
    const u = await makeUser();
    await makeMember(u.id, a.id, Role.RESIDENT);
    await makeMember(u.id, b.id, Role.RESIDENT);
    await makeTicket(a.id, u.id, { title: 'A1' });
    await makeTicket(b.id, u.id, { title: 'B1' });

    const dbA = prismaFor(a.id);
    const found = await dbA.ticket.findMany({ where: { societyId: b.id } as never });
    // The wrapper's societyId wins; b.id is overwritten.
    expect(found.map((t) => t.title)).toEqual(['A1']);
  });

  it('findUnique returns null when the ticket belongs to another society', async () => {
    const a = await makeSociety();
    const b = await makeSociety();
    const u = await makeUser();
    await makeMember(u.id, a.id, Role.RESIDENT);
    await makeMember(u.id, b.id, Role.RESIDENT);
    const tB = await makeTicket(b.id, u.id);

    const dbA = prismaFor(a.id);
    const t = await dbA.ticket.findUnique({ where: { id: tB.id } });
    expect(t).toBeNull();
  });

  it('create attaches the scoped societyId regardless of input', async () => {
    const a = await makeSociety();
    const b = await makeSociety();
    const u = await makeUser();
    await makeMember(u.id, a.id, Role.RESIDENT);

    const dbA = prismaFor(a.id);
    const created = await dbA.ticket.create({
      data: {
        societyId: b.id as unknown as string, // attempted override
        createdById: u.id,
        title: 'X',
        description: 'X',
        category: 'OTHER',
      } as never,
    });
    expect(created.societyId).toBe(a.id);
  });

  it('update refuses to touch a ticket from another society', async () => {
    const a = await makeSociety();
    const b = await makeSociety();
    const u = await makeUser();
    await makeMember(u.id, a.id, Role.RESIDENT);
    await makeMember(u.id, b.id, Role.RESIDENT);
    const tB = await makeTicket(b.id, u.id, { title: 'B-orig' });

    const dbA = prismaFor(a.id);
    await expect(
      dbA.ticket.update({ where: { id: tB.id }, data: { title: 'hacked' } }),
    ).rejects.toThrow();

    const fresh = await prisma.ticket.findUnique({ where: { id: tB.id } });
    expect(fresh?.title).toBe('B-orig');
  });
});
```

- [ ] **Step 3: Run tests, confirm they fail**

```bash
npm test -- tenantPrisma
```
Expected: FAIL — `prismaFor` not found.

- [ ] **Step 4: Implement `backend/src/db/tenantPrisma.ts`**

```ts
import type { Prisma } from '@prisma/client';
import prisma from './prisma.js';

export function prismaFor(societyId: string) {
  const scope = { societyId };

  return {
    ticket: {
      findMany: (args: Prisma.TicketFindManyArgs = {}) =>
        prisma.ticket.findMany({ ...args, where: { ...args.where, ...scope } }),

      findUnique: async (args: Prisma.TicketFindUniqueArgs) => {
        const t = await prisma.ticket.findUnique(args);
        return t && t.societyId === societyId ? t : null;
      },

      create: (args: Prisma.TicketCreateArgs) =>
        prisma.ticket.create({ ...args, data: { ...args.data, ...scope } }),

      update: (args: Prisma.TicketUpdateArgs) =>
        prisma.ticket.update({
          ...args,
          where: { ...args.where, ...scope } as Prisma.TicketWhereUniqueInput,
        }),

      delete: (args: Prisma.TicketDeleteArgs) =>
        prisma.ticket.delete({
          ...args,
          where: { ...args.where, ...scope } as Prisma.TicketWhereUniqueInput,
        }),

      count: (args: Prisma.TicketCountArgs = {}) =>
        prisma.ticket.count({ ...args, where: { ...args.where, ...scope } }),
    },

    societyMember: {
      findMany: (args: Prisma.SocietyMemberFindManyArgs = {}) =>
        prisma.societyMember.findMany({ ...args, where: { ...args.where, ...scope } }),

      findFirst: (args: Prisma.SocietyMemberFindFirstArgs = {}) =>
        prisma.societyMember.findFirst({ ...args, where: { ...args.where, ...scope } }),
    },
  };
}
```

> Note on `update`/`delete`: Prisma's `WhereUniqueInput` doesn't accept arbitrary fields by default. The `WHERE id = ? AND societyId = ?` semantics are enforced because Prisma will throw if the row's `societyId` doesn't match; that's what the test exercises. If your Prisma version is strict and rejects the extra key in `WhereUniqueInput`, replace `update`/`delete` with a two-step pattern: `findUnique` (which already returns `null` for the wrong tenant) then operate on the resulting `id`.

- [ ] **Step 5: Run tests, confirm they pass**

```bash
npm test -- tenantPrisma
```
Expected: PASS (5 tests).

If the `update` test errors with a Prisma validation error before even hitting the wrong-tenant check, swap that test's expectation to assert "throws" — the test still proves the cross-tenant update doesn't happen. If it accidentally succeeds, replace `prismaFor.ticket.update` with the two-step pattern noted above and re-run.

- [ ] **Step 6: Commit**

```bash
git add backend/src/db/tenantPrisma.ts backend/tests/helpers.ts backend/tests/unit/tenantPrisma.test.ts
git commit -m "feat(backend): add tenant-scoped Prisma helper with isolation tests"
```

---

## Task 8: `authGuard` middleware (TDD)

**Files:**
- Create: `backend/src/middleware/authGuard.ts`
- Create: `backend/tests/unit/authGuard.test.ts`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/authGuard.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import authGuard from '../../src/middleware/authGuard.js';
import { signSession } from '../../src/utils/jwt.js';

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as import('express').Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as import('express').Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('authGuard', () => {
  it('rejects missing Authorization header with 401', () => {
    const { req, res, next } = mockReqRes();
    authGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed Authorization header with 401', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Token abc' });
    authGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid JWT with 401', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer not-a-jwt' });
    authGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next on valid JWT', () => {
    const token = signSession({
      userId: 'u1',
      memberships: [{ societyId: 's1', slug: 'gv', role: 'ADMIN' }],
    });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    authGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user?.userId).toBe('u1');
    expect(req.user?.memberships).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npm test -- authGuard
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `backend/src/middleware/authGuard.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
import { verifySession } from '../utils/jwt.js';

const authGuard = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Missing or malformed Authorization header', status: 401 } });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifySession(token);
    next();
  } catch {
    res.status(401).json({ error: { message: 'Invalid or expired token', status: 401 } });
  }
};

export default authGuard;
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npm test -- authGuard
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/authGuard.ts backend/tests/unit/authGuard.test.ts
git commit -m "feat(backend): add authGuard middleware"
```

---

## Task 9: `tenantGuard` + `requireRole` middleware (TDD)

**Files:**
- Create: `backend/src/middleware/tenantGuard.ts`
- Create: `backend/src/middleware/requireRole.ts`
- Create: `backend/tests/unit/tenantGuard.test.ts`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/tenantGuard.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import tenantGuard from '../../src/middleware/tenantGuard.js';
import requireRole from '../../src/middleware/requireRole.js';
import type { SessionPayload } from '../../src/utils/jwt.js';

function mock(user: SessionPayload | undefined, slug: string, society?: { id: string; slug: string; role: 'ADMIN' | 'RESIDENT' }) {
  const req = { user, params: { slug }, society } as unknown as import('express').Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as import('express').Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('tenantGuard', () => {
  const user: SessionPayload = {
    userId: 'u1',
    memberships: [
      { societyId: 's1', slug: 'gv', role: 'ADMIN' },
      { societyId: 's2', slug: 'sk', role: 'RESIDENT' },
    ],
  };

  it('attaches req.society for a matching slug', () => {
    const { req, res, next } = mock(user, 'gv');
    tenantGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.society).toEqual({ id: 's1', slug: 'gv', role: 'ADMIN' });
  });

  it('rejects with 403 when user is not a member of the slug', () => {
    const { req, res, next } = mock(user, 'unknown');
    tenantGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when req.user is missing', () => {
    const { req, res, next } = mock(undefined, 'gv');
    tenantGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireRole', () => {
  it('allows matching role', () => {
    const { req, res, next } = mock({ userId: 'u', memberships: [] }, 'gv', { id: 's1', slug: 'gv', role: 'ADMIN' });
    requireRole('ADMIN')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks mismatching role with 403', () => {
    const { req, res, next } = mock({ userId: 'u', memberships: [] }, 'gv', { id: 's1', slug: 'gv', role: 'RESIDENT' });
    requireRole('ADMIN')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npm test -- tenantGuard
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `backend/src/middleware/tenantGuard.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';

const tenantGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Unauthenticated', status: 401 } });
    return;
  }
  const slug = req.params.slug;
  const m = req.user.memberships.find((m) => m.slug === slug);
  if (!m) {
    res.status(403).json({ error: { message: 'Not a member of this society', status: 403 } });
    return;
  }
  req.society = { id: m.societyId, slug: m.slug, role: m.role };
  next();
};

export default tenantGuard;
```

- [ ] **Step 4: Implement `backend/src/middleware/requireRole.ts`**

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { MembershipClaim } from '../utils/jwt.js';

const requireRole = (role: MembershipClaim['role']): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.society) {
    res.status(401).json({ error: { message: 'Tenant not resolved', status: 401 } });
    return;
  }
  if (req.society.role !== role) {
    res.status(403).json({ error: { message: `${role} role required`, status: 403 } });
    return;
  }
  next();
};

export default requireRole;
```

- [ ] **Step 5: Run tests, confirm they pass**

```bash
npm test -- tenantGuard
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/tenantGuard.ts backend/src/middleware/requireRole.ts backend/tests/unit/tenantGuard.test.ts
git commit -m "feat(backend): add tenantGuard + requireRole middleware"
```

---

## Task 10: Zod request validation middleware

**Files:**
- Create: `backend/src/middleware/validateBody.ts`
- Create: `backend/src/schemas/auth.schemas.ts`
- Create: `backend/src/schemas/ticket.schemas.ts`

- [ ] **Step 1: Create `validateBody.ts`**

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

const validateBody = <T>(schema: ZodSchema<T>): RequestHandler => (req: Request, res: Response, next: NextFunction): void => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: {
        message: 'Invalid request body',
        status: 400,
        details: result.error.flatten(),
      },
    });
    return;
  }
  req.body = result.data;
  next();
};

export default validateBody;
```

- [ ] **Step 2: Create `backend/src/schemas/auth.schemas.ts`**

```ts
import { z } from 'zod';

export const SendOtpSchema = z.object({
  phone: z.string().min(5).max(20),
});

const Common = {
  phone: z.string().min(5).max(20),
  otp: z.string().length(6),
};

export const VerifyOtpLoginSchema = z.object({
  ...Common,
  mode: z.literal('login'),
});

export const VerifyOtpRegisterAdminSchema = z.object({
  ...Common,
  mode: z.literal('register-admin'),
  name: z.string().min(1).max(100),
  societyName: z.string().min(2).max(120),
  address: z.string().max(300).optional(),
});

export const VerifyOtpRegisterResidentSchema = z.object({
  ...Common,
  mode: z.literal('register-resident'),
  name: z.string().min(1).max(100),
  flatNumber: z.string().min(1).max(20),
  joinCode: z.string().min(4).max(20),
});

export const VerifyOtpSchema = z.discriminatedUnion('mode', [
  VerifyOtpLoginSchema,
  VerifyOtpRegisterAdminSchema,
  VerifyOtpRegisterResidentSchema,
]);

export type VerifyOtpBody = z.infer<typeof VerifyOtpSchema>;
```

- [ ] **Step 3: Create `backend/src/schemas/ticket.schemas.ts`**

```ts
import { z } from 'zod';

export const TicketCategoryEnum = z.enum([
  'ELEVATOR', 'PLUMBING', 'ELECTRICAL', 'SECURITY', 'CLEANLINESS', 'PARKING', 'OTHER',
]);
export const TicketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const TicketStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const CreateTicketSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(2000),
  category: TicketCategoryEnum,
  priority: TicketPriorityEnum.optional(),
  location: z.string().max(100).optional(),
});

export const UpdateTicketSchema = z.object({
  status: TicketStatusEnum.optional(),
  assignedTo: z.string().max(100).nullable().optional(),
  internalNote: z.string().max(2000).nullable().optional(),
});

export type CreateTicketBody = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketBody = z.infer<typeof UpdateTicketSchema>;
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/validateBody.ts backend/src/schemas
git commit -m "feat(backend): add Zod validation middleware + auth/ticket schemas"
```

---

# Phase 3 — Auth Endpoints

## Task 11: `authService` — verify OTP and dispatch by mode (TDD)

**Files:**
- Create: `backend/src/services/authService.ts`
- Create: `backend/tests/integration/auth.test.ts`

- [ ] **Step 1: Write failing integration tests**

`backend/tests/integration/auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/db/prisma.js';
import { resetDb } from '../helpers.js';

beforeEach(resetDb);
afterAll(async () => { await resetDb(); await prisma.$disconnect(); });

describe('POST /api/auth/send-otp', () => {
  it('returns { sent: true } for a valid phone', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ phone: '9876543210' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: true });
  });

  it('returns 400 for missing phone', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('rejects wrong OTP with 401', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9876543210',
      otp: '000000',
      mode: 'login',
    });
    expect(res.status).toBe(401);
  });

  it('register-admin creates Society + User + ADMIN membership and returns JWT', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9876543210',
      otp: '123456',
      mode: 'register-admin',
      name: 'Dev Rathore',
      societyName: 'Green Valley',
      address: '12 Main Rd',
    });
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.memberships[0].role).toBe('ADMIN');
    expect(res.body.user.memberships[0].slug).toMatch(/^green-valley/);

    const society = await prisma.society.findFirst({ where: { name: 'Green Valley' } });
    expect(society).not.toBeNull();
    expect(society?.joinCode).toMatch(/^GV-/);
  });

  it('register-admin returns 409 when phone already exists', async () => {
    await request(app).post('/api/auth/verify-otp').send({
      phone: '9876543210', otp: '123456', mode: 'register-admin',
      name: 'A', societyName: 'X',
    });
    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9876543210', otp: '123456', mode: 'register-admin',
      name: 'B', societyName: 'Y',
    });
    expect(res.status).toBe(409);
  });

  it('register-resident joins by code and creates RESIDENT membership', async () => {
    const admin = await request(app).post('/api/auth/verify-otp').send({
      phone: '9111111111', otp: '123456', mode: 'register-admin',
      name: 'Admin', societyName: 'Green Valley',
    });
    const joinCode = admin.body.user.memberships[0].joinCode
      ?? (await prisma.society.findFirst())!.joinCode;

    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9222222222', otp: '123456', mode: 'register-resident',
      name: 'Resident', flatNumber: 'A-301', joinCode,
    });
    expect(res.status).toBe(201);
    expect(res.body.user.memberships[0].role).toBe('RESIDENT');
  });

  it('register-resident returns 404 for unknown joinCode', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9333333333', otp: '123456', mode: 'register-resident',
      name: 'R', flatNumber: '1', joinCode: 'XX-NOPE',
    });
    expect(res.status).toBe(404);
  });

  it('login returns 404 for unknown phone', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9444444444', otp: '123456', mode: 'login',
    });
    expect(res.status).toBe(404);
  });

  it('login returns JWT for known phone', async () => {
    await request(app).post('/api/auth/verify-otp').send({
      phone: '9555555555', otp: '123456', mode: 'register-admin',
      name: 'A', societyName: 'S',
    });
    const res = await request(app).post('/api/auth/verify-otp').send({
      phone: '9555555555', otp: '123456', mode: 'login',
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
npm test -- auth.test
```
Expected: FAIL — auth route not mounted.

- [ ] **Step 3: Implement `backend/src/services/authService.ts`**

```ts
import prisma from '../db/prisma.js';
import { Role } from '@prisma/client';
import { normalizePhone } from '../utils/phone.js';
import { slugify, makeJoinCode } from '../utils/slug.js';
import { signSession, type MembershipClaim } from '../utils/jwt.js';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const DEMO_OTP = '123456';

export function assertOtp(otp: string): void {
  if (otp !== DEMO_OTP) {
    throw new AuthError('Invalid OTP', 401);
  }
}

function membershipsFor(userId: string): Promise<MembershipClaim[]> {
  return prisma.societyMember
    .findMany({ where: { userId }, include: { society: { select: { slug: true } } } })
    .then((rows) =>
      rows.map((m) => ({ societyId: m.societyId, slug: m.society.slug, role: m.role as 'ADMIN' | 'RESIDENT' })),
    );
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || 'society';
  for (let i = 0; i < 4; i++) {
    const exists = await prisma.society.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new AuthError('Could not allocate a unique slug', 500);
}

async function uniqueJoinCode(slug: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = makeJoinCode(slug);
    const exists = await prisma.society.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new AuthError('Could not allocate a unique join code', 500);
}

export async function registerAdmin(input: { phone: string; name: string; societyName: string; address?: string }) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AuthError('Phone already registered', 409);

  const baseSlug = slugify(input.societyName);
  const slug = await uniqueSlug(baseSlug);
  const joinCode = await uniqueJoinCode(slug);

  const result = await prisma.$transaction(async (tx) => {
    const society = await tx.society.create({
      data: { name: input.societyName, slug, joinCode, address: input.address ?? null },
    });
    const user = await tx.user.create({ data: { phone, name: input.name } });
    await tx.societyMember.create({ data: { userId: user.id, societyId: society.id, role: Role.ADMIN } });
    return { user, society };
  });

  return issueSession(result.user.id, result.user.name, result.user.phone);
}

export async function registerResident(input: { phone: string; name: string; flatNumber: string; joinCode: string }) {
  const phone = normalizePhone(input.phone);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new AuthError('Phone already registered', 409);

  const society = await prisma.society.findUnique({ where: { joinCode: input.joinCode } });
  if (!society) throw new AuthError('Invalid join code', 404);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { phone, name: input.name } });
    await tx.societyMember.create({
      data: { userId: user.id, societyId: society.id, role: Role.RESIDENT, flatNumber: input.flatNumber },
    });
    return user;
  });

  return issueSession(result.id, result.name, result.phone);
}

export async function loginExisting(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new AuthError('No account found for this phone', 404);
  return issueSession(user.id, user.name, user.phone);
}

async function issueSession(userId: string, name: string, phone: string) {
  const memberships = await membershipsFor(userId);
  const token = signSession({ userId, memberships });
  return { token, user: { id: userId, name, phone, memberships } };
}
```

- [ ] **Step 4: Implement `backend/src/controllers/auth.controller.ts`**

```ts
import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { AuthError, assertOtp, loginExisting, registerAdmin, registerResident } from '../services/authService.js';
import type { VerifyOtpBody } from '../schemas/auth.schemas.js';

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({ sent: true });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as VerifyOtpBody;
  try {
    assertOtp(body.otp);

    if (body.mode === 'login') {
      const out = await loginExisting(body.phone);
      res.status(200).json(out);
      return;
    }
    if (body.mode === 'register-admin') {
      const out = await registerAdmin(body);
      res.status(201).json(out);
      return;
    }
    const out = await registerResident(body);
    res.status(201).json(out);
  } catch (e) {
    if (e instanceof AuthError) {
      res.status(e.status).json({ error: { message: e.message, status: e.status } });
      return;
    }
    throw e;
  }
});
```

- [ ] **Step 5: Implement `backend/src/routes/auth.routes.ts`**

```ts
import { Router } from 'express';
import validateBody from '../middleware/validateBody.js';
import { SendOtpSchema, VerifyOtpSchema } from '../schemas/auth.schemas.js';
import { sendOtp, verifyOtp } from '../controllers/auth.controller.js';

const router = Router();
router.post('/send-otp', validateBody(SendOtpSchema), sendOtp);
router.post('/verify-otp', validateBody(VerifyOtpSchema), verifyOtp);
export default router;
```

- [ ] **Step 6: Mount auth routes in `backend/src/routes/index.ts`**

```ts
import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export default router;
```

- [ ] **Step 7: Run tests, confirm they pass**

```bash
npm test -- auth.test
```
Expected: PASS (8 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/authService.ts backend/src/controllers/auth.controller.ts \
        backend/src/routes/auth.routes.ts backend/src/routes/index.ts \
        backend/tests/integration/auth.test.ts
git commit -m "feat(backend): implement phone+OTP auth (send-otp, verify-otp dispatch)"
```

---

## Task 12: `GET /api/me` endpoint

**Files:**
- Create: `backend/src/controllers/me.controller.ts`
- Create: `backend/src/routes/me.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Implement `me.controller.ts`**

```ts
import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../db/prisma.js';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Unauthenticated', status: 401 } });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) {
    res.status(404).json({ error: { message: 'User not found', status: 404 } });
    return;
  }
  res.json({
    user: { id: user.id, name: user.name, phone: user.phone, memberships: req.user.memberships },
  });
});
```

- [ ] **Step 2: Implement `me.routes.ts`**

```ts
import { Router } from 'express';
import authGuard from '../middleware/authGuard.js';
import { getMe } from '../controllers/me.controller.js';

const router = Router();
router.get('/', authGuard, getMe);
export default router;
```

- [ ] **Step 3: Mount in `routes/index.ts`**

```ts
import meRoutes from './me.routes.js';
// ...
router.use('/me', meRoutes);
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
# in another shell, register an admin and capture the token:
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9888888888","otp":"123456","mode":"register-admin","name":"Me","societyName":"My Soc"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s http://localhost:4000/api/me -H "Authorization: Bearer $TOKEN"
```
Expected: JSON with `user.id`, `user.name`, `user.phone`, `user.memberships`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/me.controller.ts backend/src/routes/me.routes.ts backend/src/routes/index.ts
git commit -m "feat(backend): add GET /api/me"
```

---

# Phase 4 — Ticket Endpoints

## Task 13: `ticketService` + create ticket endpoint (TDD)

**Files:**
- Create: `backend/src/services/ticketService.ts`
- Create: `backend/src/controllers/ticket.controller.ts`
- Create: `backend/src/routes/ticket.routes.ts`
- Create: `backend/src/routes/society.routes.ts`
- Modify: `backend/src/routes/index.ts`
- Create: `backend/tests/integration/ticket-happy-path.test.ts`

- [ ] **Step 1: Write the start of the integration test (just the create slice for now)**

`backend/tests/integration/ticket-happy-path.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/db/prisma.js';
import { resetDb } from '../helpers.js';

beforeEach(resetDb);
afterAll(async () => { await resetDb(); await prisma.$disconnect(); });

async function bootstrap() {
  const admin = await request(app).post('/api/auth/verify-otp').send({
    phone: '9100000001', otp: '123456', mode: 'register-admin',
    name: 'Admin', societyName: 'Green Valley',
  });
  const society = await prisma.society.findFirst();
  const resident = await request(app).post('/api/auth/verify-otp').send({
    phone: '9100000002', otp: '123456', mode: 'register-resident',
    name: 'Resident', flatNumber: 'A-301', joinCode: society!.joinCode,
  });
  return {
    adminToken: admin.body.token,
    residentToken: resident.body.token,
    slug: society!.slug,
  };
}

describe('POST /api/societies/:slug/tickets', () => {
  it('resident creates a ticket (201)', async () => {
    const { residentToken, slug } = await bootstrap();
    const res = await request(app)
      .post(`/api/societies/${slug}/tickets`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Lift making grinding sounds',
        description: 'Third floor lift, started this morning',
        category: 'ELEVATOR',
        priority: 'MEDIUM',
        location: '3rd Floor',
      });
    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe('OPEN');
    expect(res.body.ticket.societyId).toBeDefined();
  });

  it('admin cannot create a ticket (403)', async () => {
    const { adminToken, slug } = await bootstrap();
    const res = await request(app)
      .post(`/api/societies/${slug}/tickets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'X X X X X', description: 'X X X X X X X X X X', category: 'OTHER' });
    expect(res.status).toBe(403);
  });

  it('unauthenticated returns 401', async () => {
    const { slug } = await bootstrap();
    const res = await request(app)
      .post(`/api/societies/${slug}/tickets`)
      .send({ title: 'XXXXX', description: 'XXXXXXXXXX', category: 'OTHER' });
    expect(res.status).toBe(401);
  });

  it('invalid body returns 400', async () => {
    const { residentToken, slug } = await bootstrap();
    const res = await request(app)
      .post(`/api/societies/${slug}/tickets`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ title: 'no', description: 'no', category: 'BOGUS' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, confirm fails**

```bash
npm test -- ticket-happy-path
```
Expected: FAIL — endpoint not mounted.

- [ ] **Step 3: Implement `backend/src/services/ticketService.ts`**

```ts
import { prismaFor } from '../db/tenantPrisma.js';
import type { CreateTicketBody, UpdateTicketBody } from '../schemas/ticket.schemas.js';
import type { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export function createTicket(societyId: string, createdById: string, body: CreateTicketBody) {
  const db = prismaFor(societyId);
  return db.ticket.create({
    data: {
      createdById,
      title: body.title,
      description: body.description,
      category: body.category as TicketCategory,
      priority: (body.priority ?? 'MEDIUM') as TicketPriority,
      location: body.location ?? null,
      societyId, // wrapper overwrites anyway, but explicit for clarity
    },
  });
}

export function listSocietyTickets(societyId: string, filters: { status?: TicketStatus[]; category?: TicketCategory } = {}) {
  const db = prismaFor(societyId);
  return db.ticket.findMany({
    where: {
      ...(filters.status && filters.status.length ? { status: { in: filters.status } } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function listMyTickets(societyId: string, userId: string) {
  const db = prismaFor(societyId);
  return db.ticket.findMany({ where: { createdById: userId }, orderBy: { createdAt: 'desc' } });
}

export function getTicket(societyId: string, ticketId: string) {
  return prismaFor(societyId).ticket.findUnique({ where: { id: ticketId } });
}

export async function updateTicket(societyId: string, ticketId: string, body: UpdateTicketBody) {
  const existing = await getTicket(societyId, ticketId);
  if (!existing) return null;
  return prismaFor(societyId).ticket.update({ where: { id: ticketId }, data: body });
}
```

- [ ] **Step 4: Implement `backend/src/controllers/ticket.controller.ts`**

```ts
import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createTicket, listSocietyTickets, listMyTickets, getTicket, updateTicket,
} from '../services/ticketService.js';
import type { CreateTicketBody, UpdateTicketBody } from '../schemas/ticket.schemas.js';
import type { TicketCategory, TicketStatus } from '@prisma/client';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await createTicket(req.society!.id, req.user!.userId, req.body as CreateTicketBody);
  res.status(201).json({ ticket });
});

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const statusParam = (req.query.status as string | undefined)?.split(',').filter(Boolean) as TicketStatus[] | undefined;
  const categoryParam = req.query.category as TicketCategory | undefined;
  const tickets = await listSocietyTickets(req.society!.id, { status: statusParam, category: categoryParam });
  res.json({ tickets });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const tickets = await listMyTickets(req.society!.id, req.user!.userId);
  res.json({ tickets });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const t = await getTicket(req.society!.id, req.params.id);
  if (!t) { res.status(404).json({ error: { message: 'Ticket not found', status: 404 } }); return; }
  // residents can only see their own
  if (req.society!.role === 'RESIDENT' && t.createdById !== req.user!.userId) {
    res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    return;
  }
  res.json({ ticket: t });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const t = await updateTicket(req.society!.id, req.params.id, req.body as UpdateTicketBody);
  if (!t) { res.status(404).json({ error: { message: 'Ticket not found', status: 404 } }); return; }
  res.json({ ticket: t });
});
```

- [ ] **Step 5: Implement `backend/src/routes/ticket.routes.ts`**

```ts
import { Router } from 'express';
import requireRole from '../middleware/requireRole.js';
import validateBody from '../middleware/validateBody.js';
import { CreateTicketSchema, UpdateTicketSchema } from '../schemas/ticket.schemas.js';
import { create, listAll, listMine, getOne, update } from '../controllers/ticket.controller.js';

const router = Router({ mergeParams: true });

router.get('/mine', requireRole('RESIDENT'), listMine);
router.get('/', requireRole('ADMIN'), listAll);
router.get('/:id', getOne);                                  // role checked in controller
router.post('/', requireRole('RESIDENT'), validateBody(CreateTicketSchema), create);
router.patch('/:id', requireRole('ADMIN'), validateBody(UpdateTicketSchema), update);

export default router;
```

- [ ] **Step 6: Implement `backend/src/routes/society.routes.ts`**

```ts
import { Router } from 'express';
import authGuard from '../middleware/authGuard.js';
import tenantGuard from '../middleware/tenantGuard.js';
import ticketRoutes from './ticket.routes.js';

const router = Router();
router.use('/:slug', authGuard, tenantGuard);
router.use('/:slug/tickets', authGuard, tenantGuard, ticketRoutes);

export default router;
```

- [ ] **Step 7: Mount in `routes/index.ts`**

```ts
import societyRoutes from './society.routes.js';
// ...
router.use('/societies', societyRoutes);
```

- [ ] **Step 8: Run tests, confirm they pass**

```bash
npm test -- ticket-happy-path
```
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/ticketService.ts backend/src/controllers/ticket.controller.ts \
        backend/src/routes/ticket.routes.ts backend/src/routes/society.routes.ts \
        backend/src/routes/index.ts backend/tests/integration/ticket-happy-path.test.ts
git commit -m "feat(backend): add ticket CRUD endpoints scoped by tenant + role"
```

---

## Task 14: Extend happy-path test for list/get/update + cross-tenant negative test

**Files:**
- Modify: `backend/tests/integration/ticket-happy-path.test.ts`
- Create: `backend/tests/integration/cross-tenant.test.ts`

- [ ] **Step 1: Extend `ticket-happy-path.test.ts` with the remaining flows**

Append to the existing file:
```ts
describe('admin list/get/update + resident mine', () => {
  it('runs the full happy path', async () => {
    const { adminToken, residentToken, slug } = await bootstrap();

    // resident creates two tickets
    for (const title of ['First issue here', 'Second issue here']) {
      await request(app).post(`/api/societies/${slug}/tickets`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ title, description: 'enough description ok', category: 'OTHER' })
        .expect(201);
    }

    // admin lists all
    const list = await request(app).get(`/api/societies/${slug}/tickets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(list.body.tickets).toHaveLength(2);

    // resident lists own
    const mine = await request(app).get(`/api/societies/${slug}/tickets/mine`)
      .set('Authorization', `Bearer ${residentToken}`)
      .expect(200);
    expect(mine.body.tickets).toHaveLength(2);

    // admin updates first ticket
    const first = list.body.tickets[0];
    const patched = await request(app).patch(`/api/societies/${slug}/tickets/${first.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS', assignedTo: 'Ramesh', internalNote: 'on it' })
      .expect(200);
    expect(patched.body.ticket.status).toBe('IN_PROGRESS');
    expect(patched.body.ticket.assignedTo).toBe('Ramesh');

    // resident gets their own ticket
    await request(app).get(`/api/societies/${slug}/tickets/${first.id}`)
      .set('Authorization', `Bearer ${residentToken}`).expect(200);
  });

  it("resident cannot read another resident's ticket within the same society", async () => {
    const { adminToken, residentToken, slug } = await bootstrap();
    // create one ticket as the existing resident
    const created = await request(app).post(`/api/societies/${slug}/tickets`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ title: 'private one', description: 'description here ok', category: 'OTHER' })
      .expect(201);

    // create a second resident in the same society
    const society = await prisma.society.findFirst();
    const other = await request(app).post('/api/auth/verify-otp').send({
      phone: '9100000099', otp: '123456', mode: 'register-resident',
      name: 'Other', flatNumber: 'B-201', joinCode: society!.joinCode,
    });

    // other resident tries to read the first resident's ticket
    const res = await request(app).get(`/api/societies/${slug}/tickets/${created.body.ticket.id}`)
      .set('Authorization', `Bearer ${other.body.token}`);
    expect(res.status).toBe(403);

    // and `mine` returns empty for the other resident
    const mine = await request(app).get(`/api/societies/${slug}/tickets/mine`)
      .set('Authorization', `Bearer ${other.body.token}`);
    expect(mine.body.tickets).toHaveLength(0);

    // unused so eslint won't complain
    void adminToken;
  });
});
```

- [ ] **Step 2: Create `backend/tests/integration/cross-tenant.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/db/prisma.js';
import { resetDb } from '../helpers.js';

beforeEach(resetDb);
afterAll(async () => { await resetDb(); await prisma.$disconnect(); });

describe('cross-tenant isolation', () => {
  it('user from Society A cannot read tickets in Society B', async () => {
    // Society A: admin + resident
    await request(app).post('/api/auth/verify-otp').send({
      phone: '9100000010', otp: '123456', mode: 'register-admin',
      name: 'A-admin', societyName: 'Alpha Society',
    });
    const alpha = await prisma.society.findFirst({ where: { name: 'Alpha Society' } });
    const aRes = await request(app).post('/api/auth/verify-otp').send({
      phone: '9100000011', otp: '123456', mode: 'register-resident',
      name: 'A-res', flatNumber: 'A-1', joinCode: alpha!.joinCode,
    });
    await request(app).post(`/api/societies/${alpha!.slug}/tickets`)
      .set('Authorization', `Bearer ${aRes.body.token}`)
      .send({ title: 'A only ticket', description: 'do not leak this', category: 'OTHER' })
      .expect(201);

    // Society B: separate admin
    const bAdminReg = await request(app).post('/api/auth/verify-otp').send({
      phone: '9100000020', otp: '123456', mode: 'register-admin',
      name: 'B-admin', societyName: 'Beta Society',
    });

    // B's admin tries to list A's tickets
    const leak = await request(app).get(`/api/societies/${alpha!.slug}/tickets`)
      .set('Authorization', `Bearer ${bAdminReg.body.token}`);
    expect(leak.status).toBe(403); // tenantGuard fails before query
  });
});
```

- [ ] **Step 3: Run all backend tests**

```bash
npm test
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/integration
git commit -m "test(backend): extend ticket happy path + add cross-tenant isolation test"
```

---

# Phase 5 — Frontend Foundation

> **Heads-up:** Next.js 16 ships with `frontend/AGENTS.md` warning that this version has breaking changes. Before writing frontend code, skim `frontend/node_modules/next/dist/docs/` (especially `app-router.md` if present) for any API changes. Don't assume Next.js 13/14/15 conventions still apply.

## Task 15: Install frontend deps and set up Tailwind + shadcn/ui

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.mjs`
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install tailwindcss @tailwindcss/postcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install react-hook-form @hookform/resolvers zod
npm install -D @types/node
```

(Tailwind v4 ships with `@tailwindcss/postcss`; if your `next` version expects Tailwind v3, install `tailwindcss@^3` instead. Check `node_modules/next/dist/docs/` if unsure.)

- [ ] **Step 2: Create `frontend/tailwind.config.ts`** (Tailwind v3 config; if Tailwind v4 was installed, skip this and use the CSS-first config in step 4)

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Create `frontend/postcss.config.mjs`**

For Tailwind v3:
```mjs
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```
For Tailwind v4 (if that's what installed):
```mjs
export default { plugins: { '@tailwindcss/postcss': {} } };
```

- [ ] **Step 4: Replace `frontend/src/app/globals.css`**

For Tailwind v3:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
body { @apply bg-neutral-50 text-neutral-900 antialiased; }
```
For Tailwind v4:
```css
@import "tailwindcss";

:root { color-scheme: light; }
body { background: #fafafa; color: #171717; }
```

- [ ] **Step 5: Create `frontend/components.json` (shadcn config)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 6: Create `frontend/src/lib/utils.ts`**

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Initialize shadcn (interactive — accept defaults)**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card badge select textarea toast
```
This creates `frontend/src/components/ui/*`. If the CLI errors on Next.js 16 (newer than its templates), copy the components manually from `https://ui.shadcn.com` — only `button`, `input`, `label`, `card`, `badge`, `select`, `textarea` are required.

- [ ] **Step 8: Replace `frontend/src/app/page.tsx` with a simple landing**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">SocietyDesk</h1>
      <p className="text-neutral-600 max-w-md text-center">
        Multi-tenant complaint tracker for housing societies. Residents file issues, admins resolve them.
      </p>
      <div className="flex gap-3">
        <Button asChild><Link href="/signup/society">Register your society</Link></Button>
        <Button asChild variant="secondary"><Link href="/signup/resident">Join with code</Link></Button>
        <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
      </div>
      <p className="text-xs text-neutral-500">Demo OTP: <code>123456</code></p>
    </main>
  );
}
```

- [ ] **Step 9: Sanity check — start dev server**

```bash
npm run dev
```
Open `http://localhost:3000`. Expected: landing page renders with three styled buttons. Stop the server.

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tailwind.config.ts \
        frontend/postcss.config.mjs frontend/src/app/globals.css \
        frontend/components.json frontend/src/lib/utils.ts \
        frontend/src/components frontend/src/app/page.tsx
git commit -m "feat(frontend): set up Tailwind + shadcn/ui + landing page"
```

---

## Task 16: API client, auth helpers, shared types, Footer component

**Files:**
- Create: `frontend/src/lib/auth.ts`
- Create: `frontend/src/lib/apiClient.ts`
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/components/Footer.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create `frontend/src/lib/types.ts`**

```ts
export type Role = 'ADMIN' | 'RESIDENT';

export type Membership = {
  societyId: string;
  slug: string;
  role: Role;
};

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  memberships: Membership[];
};

export type Ticket = {
  id: string;
  societyId: string;
  createdById: string;
  title: string;
  description: string;
  category: 'ELEVATOR' | 'PLUMBING' | 'ELECTRICAL' | 'SECURITY' | 'CLEANLINESS' | 'PARKING' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  location: string | null;
  assignedTo: string | null;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Create `frontend/src/lib/auth.ts`**

```ts
'use client';
import type { SessionUser } from './types';

const TOKEN_KEY = 'sdesk_token';
const USER_KEY = 'sdesk_user';

export function saveSession(token: string, user: SessionUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
```

- [ ] **Step 3: Create `frontend/src/lib/apiClient.ts`**

```ts
'use client';
import { getToken, clearSession } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    const msg = body?.error?.message ?? `Request failed: ${res.status}`;
    throw new ApiError(msg, res.status, body?.error?.details);
  }
  return body as T;
}
```

- [ ] **Step 4: Create `frontend/src/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="border-t mt-8 py-4 text-center text-xs text-neutral-500">
      Built by{' '}
      <span className="font-medium text-neutral-700">Dev Rathore</span>
      {' · '}
      <a className="underline" href="https://github.com/YOUR_GITHUB" target="_blank" rel="noreferrer">GitHub</a>
      {' · '}
      <a className="underline" href="https://www.linkedin.com/in/YOUR_LINKEDIN" target="_blank" rel="noreferrer">LinkedIn</a>
    </footer>
  );
}
```

> Replace `YOUR_GITHUB` / `YOUR_LINKEDIN` / "Dev Rathore" with the developer's real handles before deploying.

- [ ] **Step 5: Update `frontend/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'SocietyDesk',
  description: 'Multi-tenant complaint tracker for housing societies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Sanity check**

```bash
npm run dev
```
Open `http://localhost:3000`. Confirm footer renders. Stop server.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib frontend/src/components/Footer.tsx frontend/src/app/layout.tsx
git commit -m "feat(frontend): add apiClient, auth helpers, types, Footer"
```

---

# Phase 6 — Frontend Public Pages

## Task 17: Reusable two-step OTP form component

**Files:**
- Create: `frontend/src/components/OtpStep.tsx`

- [ ] **Step 1: Create `OtpStep.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type Props = {
  onVerify: (otp: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export default function OtpStep({ onVerify, loading, error }: Props) {
  const [otp, setOtp] = useState('');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => { e.preventDefault(); onVerify(otp); }}
    >
      <Label htmlFor="otp">Enter OTP</Label>
      <Input id="otp" inputMode="numeric" maxLength={6} value={otp}
             onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
      <p className="text-xs text-neutral-500">Demo OTP: <code>123456</code></p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || otp.length !== 6}>
        {loading ? 'Verifying…' : 'Verify'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/OtpStep.tsx
git commit -m "feat(frontend): add OtpStep shared component"
```

---

## Task 18: `/login` page

**Files:**
- Create: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { saveSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import OtpStep from '@/components/OtpStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'phone' | 'otp';

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally { setLoading(false); }
  }

  async function verify(otp: string) {
    setError(null); setLoading(true);
    try {
      const out = await api<{ token: string; user: SessionUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, mode: 'login' }),
      });
      saveSession(out.token, out.user);
      const first = out.user.memberships[0];
      if (!first) { router.push('/'); return; }
      router.push(first.role === 'ADMIN' ? `/s/${first.slug}/admin` : `/s/${first.slug}/resident`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="max-w-sm mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {step === 'phone' && (
        <form className="flex flex-col gap-3" onSubmit={sendOtp}>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || phone.length < 5}>
            {loading ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      )}
      {step === 'otp' && <OtpStep onVerify={verify} loading={loading} error={error} />}
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Start backend (`backend/$ npm run dev`) and frontend (`frontend/$ npm run dev`). Visit `http://localhost:3000/login`. Try a known phone (one you registered earlier via curl) → enter `123456` → redirects to `/s/<slug>/admin`. Try an unknown phone → expect a 404 message.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat(frontend): add /login page"
```

---

## Task 19: `/signup/society` (admin) and `/signup/resident` pages

**Files:**
- Create: `frontend/src/app/signup/society/page.tsx`
- Create: `frontend/src/app/signup/resident/page.tsx`

- [ ] **Step 1: Create `frontend/src/app/signup/society/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { saveSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import OtpStep from '@/components/OtpStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupSociety() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', societyName: '', address: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: form.phone }) });
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function verify(otp: string) {
    setError(null); setLoading(true);
    try {
      const out = await api<{ token: string; user: SessionUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ ...form, otp, mode: 'register-admin' }),
      });
      saveSession(out.token, out.user);
      const m = out.user.memberships[0];
      router.push(`/s/${m!.slug}/admin`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="max-w-md mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Register your society</h1>
      {step === 'form' && (
        <form className="flex flex-col gap-3" onSubmit={next}>
          <Label>Your name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Label>Society name</Label>
          <Input value={form.societyName} onChange={(e) => setForm({ ...form, societyName: e.target.value })} />
          <Label>Address (optional)</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || !form.name || !form.societyName || !form.phone}>
            {loading ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      )}
      {step === 'otp' && <OtpStep onVerify={verify} loading={loading} error={error} />}
    </main>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/signup/resident/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { saveSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import OtpStep from '@/components/OtpStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupResident() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', flatNumber: '', joinCode: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: form.phone }) });
      setStep('otp');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function verify(otp: string) {
    setError(null); setLoading(true);
    try {
      const out = await api<{ token: string; user: SessionUser }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ ...form, otp, mode: 'register-resident' }),
      });
      saveSession(out.token, out.user);
      const m = out.user.memberships[0];
      router.push(`/s/${m!.slug}/resident`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally { setLoading(false); }
  }

  return (
    <main className="max-w-md mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Join a society</h1>
      {step === 'form' && (
        <form className="flex flex-col gap-3" onSubmit={next}>
          <Label>Join code</Label>
          <Input value={form.joinCode} onChange={(e) => setForm({ ...form, joinCode: e.target.value.toUpperCase() })} placeholder="GV-A4F2" />
          <Label>Your name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Label>Flat number</Label>
          <Input value={form.flatNumber} onChange={(e) => setForm({ ...form, flatNumber: e.target.value })} placeholder="A-301" />
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading || !form.name || !form.joinCode || !form.phone || !form.flatNumber}>
            {loading ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      )}
      {step === 'otp' && <OtpStep onVerify={verify} loading={loading} error={error} />}
    </main>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Start both servers. From the landing page:
- Click "Register your society" → fill the form → enter OTP `123456` → land in `/s/<slug>/admin` (page will 404 for now — that's fine).
- Open the admin's society in Prisma Studio and copy its `joinCode`. Sign out (clear localStorage from devtools).
- Click "Join with code" → use the join code → enter OTP `123456` → land in `/s/<slug>/resident`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/signup
git commit -m "feat(frontend): add /signup/society and /signup/resident pages"
```

---

# Phase 7 — Frontend Society Pages

## Task 20: Society shell layout (`/s/[slug]/layout.tsx`)

**Files:**
- Create: `frontend/src/app/s/[slug]/layout.tsx`

- [ ] **Step 1: Create the shell layout**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearSession } from '@/lib/auth';
import type { Membership } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function SocietyLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [me, setMe] = useState<Membership | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/login'); return; }
    const m = u.memberships.find((x) => x.slug === slug);
    if (!m) { router.push('/'); return; }
    setMe(m);
  }, [slug, router]);

  if (!me) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">SocietyDesk</Link>
          <span className="text-sm text-neutral-500">/ {slug}</span>
        </div>
        <nav className="flex gap-2 items-center">
          {me.role === 'ADMIN' && <Button asChild variant="ghost"><Link href={`/s/${slug}/admin`}>Dashboard</Link></Button>}
          {me.role === 'RESIDENT' && (
            <>
              <Button asChild variant="ghost"><Link href={`/s/${slug}/resident`}>My Issues</Link></Button>
              <Button asChild><Link href={`/s/${slug}/resident/tickets/new`}>New Issue</Link></Button>
            </>
          )}
          <Button variant="ghost" onClick={() => { clearSession(); router.push('/login'); }}>Sign out</Button>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/s
git commit -m "feat(frontend): add society shell layout with role-aware nav"
```

---

## Task 21: StatusBadge + TicketCard components

**Files:**
- Create: `frontend/src/components/StatusBadge.tsx`
- Create: `frontend/src/components/TicketCard.tsx`

- [ ] **Step 1: Create `StatusBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import type { Ticket } from '@/lib/types';

const COLORS: Record<Ticket['status'], string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-neutral-200 text-neutral-700',
};

export default function StatusBadge({ status }: { status: Ticket['status'] }) {
  return <Badge className={COLORS[status]}>{status.replace('_', ' ')}</Badge>;
}
```

- [ ] **Step 2: Create `TicketCard.tsx`**

```tsx
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import type { Ticket } from '@/lib/types';

type Props = { ticket: Ticket; href?: string };

export default function TicketCard({ ticket, href }: Props) {
  const body = (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium">{ticket.title}</div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="text-xs text-neutral-500">{ticket.category} · {ticket.priority}{ticket.location ? ` · ${ticket.location}` : ''}</div>
        <p className="text-sm text-neutral-700 line-clamp-2">{ticket.description}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StatusBadge.tsx frontend/src/components/TicketCard.tsx
git commit -m "feat(frontend): add StatusBadge and TicketCard components"
```

---

## Task 22: Admin Kanban dashboard (`/s/[slug]/admin/page.tsx`)

**Files:**
- Create: `frontend/src/app/s/[slug]/admin/page.tsx`

- [ ] **Step 1: Create the dashboard**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import type { Ticket } from '@/lib/types';
import TicketCard from '@/components/TicketCard';

const COLUMNS: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ tickets: Ticket[] }>(`/api/societies/${slug}/tickets`)
      .then((d) => setTickets(d.tickets))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [slug]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!tickets) return <p>Loading…</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((status) => {
        const inCol = tickets.filter((t) => t.status === status);
        return (
          <section key={status} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">{status.replace('_', ' ')} ({inCol.length})</h2>
            <div className="flex flex-col gap-2">
              {inCol.map((t) => (
                <TicketCard key={t.id} ticket={t} href={`/s/${slug}/admin/tickets/${t.id}`} />
              ))}
              {inCol.length === 0 && <p className="text-xs text-neutral-400">None</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Sign in as the admin you registered earlier. Navigate to `/s/<slug>/admin`. Expected: empty columns. Sign in as the resident and create a ticket via the API (next task), then refresh the admin page to see it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/s/[slug]/admin/page.tsx
git commit -m "feat(frontend): admin Kanban dashboard"
```

---

## Task 23: Admin ticket detail + edit (`/s/[slug]/admin/tickets/[id]/page.tsx`)

**Files:**
- Create: `frontend/src/app/s/[slug]/admin/tickets/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import type { Ticket } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUSES: Ticket['status'][] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function AdminTicketDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [status, setStatus] = useState<Ticket['status']>('OPEN');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets/${id}`)
      .then((d) => {
        setTicket(d.ticket);
        setAssignedTo(d.ticket.assignedTo ?? '');
        setInternalNote(d.ticket.internalNote ?? '');
        setStatus(d.ticket.status);
      });
  }, [slug, id]);

  async function save() {
    setSaving(true);
    try {
      const out = await api<{ ticket: Ticket }>(`/api/societies/${slug}/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, assignedTo: assignedTo || null, internalNote: internalNote || null }),
      });
      setTicket(out.ticket);
    } finally { setSaving(false); }
  }

  if (!ticket) return <p>Loading…</p>;

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{ticket.title}</h1>
          <p className="text-xs text-neutral-500">{ticket.category} · {ticket.priority}{ticket.location ? ` · ${ticket.location}` : ''}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t">
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Ticket['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assigned to</Label>
          <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Staff name" />
        </div>
        <div className="md:col-span-2">
          <Label>Internal note</Label>
          <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        <Button variant="ghost" onClick={() => router.push(`/s/${slug}/admin`)}>Back</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/s/[slug]/admin/tickets
git commit -m "feat(frontend): admin ticket detail + edit page"
```

---

## Task 24: Resident "My Issues" list (`/s/[slug]/resident/page.tsx`)

**Files:**
- Create: `frontend/src/app/s/[slug]/resident/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import type { Ticket } from '@/lib/types';
import TicketCard from '@/components/TicketCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ResidentList() {
  const { slug } = useParams<{ slug: string }>();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  useEffect(() => {
    api<{ tickets: Ticket[] }>(`/api/societies/${slug}/tickets/mine`).then((d) => setTickets(d.tickets));
  }, [slug]);

  if (!tickets) return <p>Loading…</p>;
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 mb-4">No issues yet.</p>
        <Button asChild><Link href={`/s/${slug}/resident/tickets/new`}>Report your first issue</Link></Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {tickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/s/[slug]/resident/page.tsx
git commit -m "feat(frontend): resident My Issues list"
```

---

## Task 25: Resident ticket creation form (`/s/[slug]/resident/tickets/new/page.tsx`)

**Files:**
- Create: `frontend/src/app/s/[slug]/resident/tickets/new/page.tsx`

- [ ] **Step 1: Create the form**

```tsx
'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import type { Ticket } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATS: Ticket['category'][] = ['ELEVATOR','PLUMBING','ELECTRICAL','SECURITY','CLEANLINESS','PARKING','OTHER'];
const PRIORS: Ticket['priority'][] = ['LOW','MEDIUM','HIGH','URGENT'];

export default function NewTicket() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', description: '', category: 'OTHER' as Ticket['category'],
    priority: 'MEDIUM' as Ticket['priority'], location: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      await api(`/api/societies/${slug}/tickets`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          location: form.location || undefined,
        }),
      });
      router.push(`/s/${slug}/resident`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="max-w-lg flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Report an issue</h1>
      <Label>Title</Label>
      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short description" />
      <Label>Details</Label>
      <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="When did it start? Any other context?" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Ticket['category'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Ticket['priority'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Label>Location (optional)</Label>
      <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="3rd Floor / Block A Lobby" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || form.title.length < 5 || form.description.length < 10}>
        {saving ? 'Submitting…' : 'Submit'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Full manual end-to-end test**

With both servers running:
1. Register a new society and admin via `/signup/society`.
2. Copy the joinCode from Prisma Studio.
3. Open an incognito window, register as a resident via `/signup/resident`.
4. As resident: create a ticket via `New Issue`. Confirm it appears in `My Issues`.
5. As admin (regular window): refresh `/s/<slug>/admin`. The ticket appears in the OPEN column.
6. Click the ticket → set status `IN_PROGRESS`, set `assignedTo` to "Ramesh" → Save.
7. As resident: refresh `/s/<slug>/resident`. The status badge now shows "IN PROGRESS".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/s/[slug]/resident/tickets
git commit -m "feat(frontend): resident new-ticket form + e2e flow working"
```

---

# Phase 8 — CI + Deployment

## Task 26: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: problem_tracker_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/problem_tracker_test?schema=public
      TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/problem_tracker_test?schema=public
      JWT_SECRET: ci-only-secret-do-not-use-in-prod
      PORT: '4000'
      NODE_ENV: test
      CORS_ORIGIN: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm', cache-dependency-path: backend/package-lock.json }
      - run: npm ci
        working-directory: backend
      - run: npx prisma generate
        working-directory: backend
      - run: npm run typecheck
        working-directory: backend
      - run: npm test
        working-directory: backend

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
        working-directory: frontend
      - run: npx tsc --noEmit
        working-directory: frontend
      - run: npm run lint
        working-directory: frontend
```

- [ ] **Step 2: Push and confirm green**

Push the branch, open a PR if you're working on one, watch CI. Expected: both jobs green.

- [ ] **Step 3: Commit (already pushed)**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add backend + frontend GitHub Actions workflow"
git push
```

---

## Task 27: Deploy database (Neon)

This is a one-time manual step. No code changes.

- [ ] **Step 1: Create Neon project**

1. Go to `https://console.neon.tech`, sign in.
2. Create a new project: name `problem-tracker`, region nearest you, Postgres 16.
3. Copy the connection string (it looks like `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
4. Note this URL — you'll paste it into Railway's env in Task 28.

- [ ] **Step 2: Apply migrations to Neon**

From your machine:
```bash
cd backend
DATABASE_URL='<paste neon URL>' npx prisma migrate deploy
```
Expected: migrations applied.

---

## Task 28: Deploy backend (Railway)

- [ ] **Step 1: Create Railway project**

1. Go to `https://railway.app`, sign in with GitHub.
2. New project → Deploy from GitHub repo → select this repo → set root path to `backend/`.
3. Railway detects Node. Set the build command if needed: leave default.
4. Set the start command: `npx prisma migrate deploy && npm start`.

- [ ] **Step 2: Set environment variables in Railway**

In the project's Variables tab, add:
```
PORT=4000
NODE_ENV=production
DATABASE_URL=<Neon URL from Task 27>
CORS_ORIGIN=<your Vercel URL, fill after Task 29; for now: *>
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
```

- [ ] **Step 3: Deploy and grab the public URL**

Railway auto-deploys on push. Wait for the deploy to finish, then click the auto-generated URL (e.g. `problem-tracker-production.up.railway.app`). Test:
```bash
curl https://<railway-url>/api/health
```
Expected: 200 with `db: "connected"`.

---

## Task 29: Deploy frontend (Vercel)

- [ ] **Step 1: Create Vercel project**

1. Go to `https://vercel.com`, sign in with GitHub.
2. Import this repo. Set the root directory to `frontend/`.
3. Framework preset: Next.js (auto-detected).

- [ ] **Step 2: Set environment variable**

Add:
```
NEXT_PUBLIC_API_URL=https://<railway-url>
```

- [ ] **Step 3: Deploy and grab the public URL**

Vercel deploys. Open the production URL.

- [ ] **Step 4: Tighten CORS on Railway**

Go back to Railway, update `CORS_ORIGIN` to the exact Vercel URL (e.g. `https://problem-tracker.vercel.app`), redeploy.

---

## Task 30: Final end-to-end verification on the deployed app

- [ ] **Step 1: Live smoke test**

On the deployed frontend:
1. Visit landing page → footer shows name + GitHub + LinkedIn links.
2. Register a society → land in admin dashboard with empty Kanban.
3. Copy the joinCode (you may need a temporary admin route to show it in the UI — see Task 31 if you want to add this; otherwise read it from Prisma Studio against Neon).
4. In an incognito window, register a resident with that joinCode.
5. Create a ticket as the resident.
6. Switch to admin, refresh, ticket appears, assign + change status.
7. Switch to resident, refresh, status badge updates.

- [ ] **Step 2: README in the repo root**

Create `/Users/devrathore/Desktop/developement/problemTracker/README.md` (overwrite the placeholder):

```markdown
# SocietyDesk — Multi-Tenant Society Complaint Tracker

Live: https://<vercel-url>
API: https://<railway-url>

## Demo

- **Demo OTP**: `123456` (works for any phone)
- Register a society at `/signup/society`, copy the join code from the admin dashboard
- Join as a resident at `/signup/resident` using that code

## Stack

- Backend: Node 20, Express 5, TypeScript, Prisma, Postgres, JWT
- Frontend: Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui
- Hosting: Vercel (FE) + Railway (BE) + Neon (DB)

## Architecture

Multi-tenant via path-based slugs (`/s/[slug]/...`) with three layers of tenant isolation:
1. JWT carries the user's memberships
2. `tenantGuard` middleware validates slug ↔ membership match
3. `prismaFor(societyId)` wrapper makes it impossible to forget the `WHERE societyId = ?` filter

## Local development

See `backend/README.md` and `frontend/README.md`.

---

Built by **Dev Rathore** — [GitHub](https://github.com/YOUR_GITHUB) · [LinkedIn](https://www.linkedin.com/in/YOUR_LINKEDIN)
```

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: top-level README with live URLs + demo instructions"
git push
```

The assignment is now submittable: GitHub repo URL + live frontend URL, footer present on every page.

---

# Optional Polish (only if time permits)

The following are nice-to-haves explicitly out of scope for this iteration's spec; mention as "future work" in the submission instead of building unless you have spare hours:

- Show the `joinCode` on the admin dashboard header so admins don't need DB access.
- Add a `react-hook-form + zod` rewrite of the heavy forms — current `useState` versions work, just less ergonomic.
- Add a `Toast` for success/error messages (shadcn already added).
- Wire up the AI complaint-intake agent (covered in the deferred follow-up spec).
