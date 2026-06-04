# Alyson AI Backend

Production-grade Node.js/Express API for the Alyson AI local news intelligence platform.

## Stack

- **Runtime:** Node.js 22 + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** BullMQ + Redis
- **Auth:** JWT (access + refresh)
- **AI:** OpenAI, Anthropic Claude, DeepSeek (with fallback routing)
- **Email:** Salesforce Marketing Cloud, GMass
- **Scraping:** Reddit JSON, RSS (BBC/Reuters), Cheerio, Puppeteer-ready

## Quick Start

### Docker (recommended)

```bash
cd backend
cp .env.example .env
# Edit .env with secrets

docker compose up -d postgres redis
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

In another terminal:

```bash
npm run worker
```

### API

- Base URL: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api-docs`
- Health: `GET /api/v1/health`

### Default login (after seed)

- Email: `admin@alyson.news`
- Password: `AlysonAI2026!`

## API Modules

| Route | Description |
|-------|-------------|
| `/auth` | Login, refresh, logout, me |
| `/cities` | Multi-city CMS (isolated per city) |
| `/articles` | CRUD, AI generation, scheduling |
| `/rankings` | Homepage top-10, recalculation, manual override |
| `/moderation` | Review queue, approve/reject/escalate |
| `/ai` | Queued AI jobs, pipeline stats |
| `/analytics` | Dashboard, events, subscriber growth |
| `/integrations` | Provider credentials (encrypted) |
| `/subscribers` | Per-city subscriber management |
| `/email` | Campaigns, send, open/click tracking |
| `/scraping` | Reddit/RSS/social raw ingestion |
| `/settings` | Moderation, thresholds, automation |
| `/jobs` | System job audit log |

## Response Format

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
```

```json
{ "success": false, "error": "Message", "code": "ERROR_CODE" }
```

## Architecture

```
src/
  api/routes/       REST route definitions
  controllers/      Request handlers
  services/         Business logic
  middleware/       Auth, validation, errors
  jobs/             BullMQ workers + scheduler
  config/           Env, DB, Redis, queues, Swagger
  utils/            Helpers
prisma/
  schema.prisma     Authoritative data model
  seed.ts           Cities, users, settings, sample data
```

## Schema

Tables follow the authoritative Excel schema (`cities`, `articles`, `article_content`, `ai_generations`, etc.) plus documented extensions:

- `article_versions` — edit/AI audit history
- `homepage_slots` — top-10 ranking placements
- `system_jobs` — background job tracking
- `settings` — platform configuration
- `refresh_tokens`, `integration_credentials` — required for auth/security

## Environment

See `.env.example` for all variables. Required:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`

AI and email providers are optional; features degrade gracefully when keys are missing.
