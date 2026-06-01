# SocietyDesk

SocietyDesk is a complaint and maintenance tracking app for housing societies and apartment communities.

Residents can report issues such as water leakage, lift problems, electrical faults, parking conflicts, cleanliness issues, and security concerns. Society admins get a simple dashboard to view, assign, update, and close those complaints.

The app also includes an AI-assisted chat flow that understands the resident's message, mirrors their language, and creates a useful ticket title, description, category, and priority.

## What this project does

- Lets an admin register a housing society.
- Generates a join code for residents.
- Lets residents join their society using the join code.
- Allows residents to report issues using a form or AI chat.
- Shows residents only their own tickets.
- Shows admins all society tickets in a status-based dashboard.
- Lets admins update ticket status, assignment, and internal notes.
- Keeps each society isolated using tenant-aware routes and role checks.

## Main features

- Phone + demo OTP login
- Admin and resident roles
- Multi-society support
- Resident issue reporting
- AI complaint intake with language mirroring
- Admin ticket dashboard
- Ticket statuses: Open, In Progress, Resolved, Closed
- Prisma + PostgreSQL database
- Production-ready frontend/backend deployment setup

## Tech stack

### Frontend

- Next.js
- React
- TypeScript
- React Query
- Tailwind CSS
- Lucide icons

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT authentication
- Google ADK / Gemini for AI chat intake

## Project structure

```txt
problemTracker/
├── frontend/        # Next.js web app
├── backend/         # Express API + Prisma
├── DEPLOYMENT.md    # Production deployment notes
└── README.md
```

## Local setup

### 1. Clone the repo

```bash
git clone https://github.com/DevPro6269/problem_tracker.git
cd problem_tracker
```

### 2. Setup backend

```bash
cd backend
npm install
cp .env.example .env
```

Update `backend/.env`:

```txt
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/problem_tracker?schema=public
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_API_KEY=your-google-ai-studio-api-key
```

Run migrations:

```bash
npm run prisma:migrate
```

Start backend:

```bash
npm run dev
```

Backend health check:

```txt
http://localhost:4000/api/health
```

### 3. Setup frontend

Open another terminal:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Update `frontend/.env.local` if needed:

```txt
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start frontend:

```bash
npm run dev
```

Frontend runs at:

```txt
http://localhost:3000
```

## Demo login

The current project uses a demo OTP:

```txt
123456
```

This is useful for testing but should be replaced with a real OTP provider before production use.

## Useful scripts

### Backend

```bash
npm run dev              # Start backend in development
npm run build            # Build backend for production
npm start                # Start production backend from dist/
npm run typecheck        # Type-check backend
npm run prisma:migrate   # Create/apply local Prisma migration
npm run prisma:deploy    # Apply migrations in production
```

### Frontend

```bash
npm run dev      # Start frontend in development
npm run build    # Build frontend for production
npm run start    # Start production frontend
npm run lint     # Run ESLint
```

## Deployment

Recommended setup:

- Frontend: Vercel
- Backend: Render
- Database: Neon, Supabase, Render Postgres, or Railway Postgres

Backend production commands:

```txt
Root directory: backend
Build command: npm ci && npm run build && npm run prisma:deploy
Start command: npm start
```

Frontend production settings:

```txt
Root directory: frontend
Build command: npm run build
Environment variable: NEXT_PUBLIC_API_URL=https://your-backend-url
```

Read the full deployment guide here:

[DEPLOYMENT.md](./DEPLOYMENT.md)

## Notes

- Keep `.env` files private.
- Set `CORS_ORIGIN` on the backend to your deployed frontend URL.
- The frontend reads `NEXT_PUBLIC_API_URL` at build time, so redeploy the frontend after changing it.
- The AI chat requires `GOOGLE_API_KEY`.

