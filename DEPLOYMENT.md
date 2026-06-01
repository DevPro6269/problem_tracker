# SocietyDesk deployment guide

This project is a two-service app:

- `frontend/`: Next.js app
- `backend/`: Express API with Prisma and PostgreSQL

Recommended deployment:

- Frontend: Vercel
- Backend: Render, Railway, Fly.io, or any Node.js service host
- Database: Neon, Supabase, Railway Postgres, Render Postgres, or any hosted PostgreSQL database

## 1. Create a production PostgreSQL database

Create a hosted PostgreSQL database and copy its connection string.

It should look similar to:

```txt
postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
```

Use this value as `DATABASE_URL` in the backend service.

## 2. Deploy the backend

Create a new Node.js web service using the `backend/` directory as the service root.

Use these commands:

```txt
Build command: npm ci && npm run build
Pre-deploy command: npm run prisma:deploy
Start command: npm start
```

If your host does not support a pre-deploy command, run this once from the backend service shell after setting `DATABASE_URL`:

```bash
npm run prisma:deploy
```

Backend environment variables:

```txt
PORT=4000
NODE_ENV=production
DATABASE_URL=your_postgres_connection_string
CORS_ORIGIN=https://your-frontend-domain.vercel.app
JWT_SECRET=use_a_long_random_secret
GOOGLE_API_KEY=your_google_ai_studio_api_key
```

After deployment, test:

```txt
https://your-backend-domain/api/health
```

Expected result:

```json
{ "status": "ok", "db": "connected" }
```

## 3. Deploy the frontend

Create a new Vercel project using the `frontend/` directory as the root directory.

Use the default Next.js settings:

```txt
Build command: npm run build
Output directory: .next
Install command: npm ci
```

Frontend environment variables:

```txt
NEXT_PUBLIC_API_URL=https://your-backend-domain
```

Redeploy the frontend after adding the environment variable.

## 4. Update backend CORS

After Vercel gives you the final frontend URL, update the backend `CORS_ORIGIN`:

```txt
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

For local plus production access, use comma-separated values:

```txt
CORS_ORIGIN=http://localhost:3000,https://your-frontend-domain.vercel.app
```

Then redeploy or restart the backend.

## 5. Production notes

- Keep `.env` and `.env.local` out of git.
- `JWT_SECRET` should be long and random.
- `GOOGLE_API_KEY` is required because the backend initializes the AI intake agent.
- Run `npm run prisma:deploy` whenever you add a new Prisma migration.
- The frontend reads `NEXT_PUBLIC_API_URL` at build time, so redeploy the frontend after changing it.

