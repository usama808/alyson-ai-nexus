# Run Alyson AI Locally (No Docker)

No Docker, Postgres, Redis, or LLM API keys required.

## What runs locally

| Component | Local setup |
|-----------|-------------|
| Database | **SQLite** file at `backend/data/alyson.db` |
| Queues | **Inline** (jobs run in the API process) |
| AI | **Mock** responses when `MOCK_AI=true` |
| Email | **Mock** send when `MOCK_EMAIL=true` |

> DuckDB is not used because Prisma does not support it natively; SQLite is the embedded equivalent for local dev.

## One-time setup

```powershell
cd backend
npm install
```

## Start everything

**Option A — PowerShell script**

```powershell
.\scripts\start-local.ps1
```

**Option B — Two terminals**

```powershell
# Terminal 1 — API
cd backend
npm run dev:local

# Terminal 2 — Frontend
cd ..
npm run dev
```

**Option C — Single command**

```powershell
# First time only:
npm run setup:api

# Every day (do not run setup while the API is running):
npm run dev:all
```

First-time setup + start: `npm run dev:all:setup`

If you see `EPERM` on `query_engine-windows.dll.node`, stop the old API first:

```powershell
Get-NetTCPConnection -LocalPort 4000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## URLs

- Frontend: http://localhost:5173
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api-docs

## Login (after seed)

- Email: `admin@alyson.news`
- Password: `AlysonAI2026!`

```powershell
curl -X POST http://localhost:4000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@alyson.news","password":"AlysonAI2026!"}'
```

## Live articles on the dashboard

With `VITE_API_URL` and `VITE_AUTO_REFRESH_FEED=true` in the root `.env`:

1. On first visit each session, the app pulls **Reddit** + **Google News** stories per city.
2. Stories are saved as **city-scoped articles** in SQLite.
3. Dashboard, Articles, and City pages read from `GET /api/v1/feed/articles`.

Use **Refresh live articles** on the dashboard to pull again manually.

Public feed routes (no login): `/api/v1/feed/articles`, `/api/v1/feed/cities`, `POST /api/v1/feed/refresh`

## OpenAI (ChatGPT) connection

In `backend/.env` (never commit this file):

```
MOCK_AI=false
OPENAI_API_KEY=sk-proj-...
```

Restart the API after changing keys. The article editor auto-signs in as `admin@alyson.news` in dev and calls `POST /articles/:id/ai/generate` (GPT-4o).

Optional additional providers:

```
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=...
```

## Production (Docker)

Use `backend/docker-compose.yml` with Postgres + Redis when ready.
