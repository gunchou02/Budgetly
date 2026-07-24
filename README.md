# Budgetly

Budgetly is a Japanese-language personal finance application for monthly
budgets, expenses, subscriptions, receipt OCR, dashboards, and AI spending
insights.

The primary application is now a Next.js full-stack service backed by
PostgreSQL. FastAPI handles compute-heavy and AI-oriented work such as receipt
image analysis and natural-language reports.

## Current Stack

| Area | Technology | Responsibility |
| --- | --- | --- |
| Web and main API | Next.js 16, TypeScript | UI, routing, auth, CRUD, ownership, reports |
| Styling | Tailwind CSS | Existing responsive product UI |
| Data access | Prisma 7 | Schema, migrations, typed PostgreSQL queries |
| Database | PostgreSQL 17 / Neon | Product data, sessions, cache, rate limits |
| Heavy processing | Python, FastAPI | OCR, image preprocessing, OpenAI calls |
| Receipt storage | Local filesystem / Vercel Blob | Private receipt images |
| Background work | Next.js `after` / Vercel Queues | Receipt analysis dispatch |
| Deployment | Docker, Vercel, Neon | Local development and production hosting |

Laravel, MySQL, and Redis remain in Docker temporarily as the legacy
implementation. New product work should target the Next.js API and PostgreSQL.

## Service Boundary

Next.js owns:

- registration, login, logout, and server-side sessions
- user ownership and authorization
- categories, budgets, expenses, and subscriptions
- deterministic dashboard and report calculations
- receipt metadata, confirmation, storage, and retry state
- AI request rate limiting and result caching

FastAPI owns:

- receipt image normalization and OCR/vision analysis
- OpenAI provider calls and structured-output validation
- natural-language monthly spending insights
- other CPU-heavy or AI-heavy APIs added later

FastAPI is not exposed directly to the browser. Next.js authenticates the user,
loads only that user's data, and calls FastAPI with an internal service token.

## Directory Structure

```text
Budgetly/
├── frontend/              # Primary Next.js web application and API
│   ├── prisma/            # PostgreSQL schema and migrations
│   ├── src/app/api/       # Route Handlers
│   ├── src/server/        # Auth, reports, storage, queues, AI client
│   └── tests/             # Unit and integration tests
├── ai-service/            # FastAPI OCR and AI service
├── backend/               # Legacy Laravel API
├── docker/                # Legacy PHP and Nginx development images
├── docs/                  # Architecture, API, deployment, and QA docs
└── docker-compose.yml
```

## Local Development

Docker is the supported way to run the complete local environment.

```bash
cp .env.example .env
docker compose up -d --build
```

The frontend container runs `prisma migrate deploy` before starting Next.js, so
a new PostgreSQL volume is initialized automatically.

| Service | URL |
| --- | --- |
| Budgetly app and primary API | http://127.0.0.1:5173 |
| Primary API health | http://127.0.0.1:5173/api/health |
| FastAPI health | http://127.0.0.1:8000/health |
| Legacy Laravel API | http://127.0.0.1:8080/api/health |

The default local AI providers are deterministic fakes and do not incur API
costs. To test OpenAI, configure these values in the root `.env`:

```dotenv
AI_RECEIPT_PROVIDER=openai
AI_REPORT_PROVIDER=openai
OPENAI_API_KEY=your-key
AI_OPENAI_MODEL=gpt-4o-mini
```

Then recreate the AI service:

```bash
docker compose up -d --build ai-service
```

## Main Commands

```bash
# Follow application logs
docker compose logs -f frontend ai-service postgres

# Next.js lint, tests, and production build
docker compose run --rm --no-deps frontend npm run lint
docker compose run --rm --no-deps frontend npm run test:run
docker compose run --rm --no-deps frontend npm run build

# Full API integration flow against the running frontend
docker compose run --rm --no-deps \
  -e BUDGETLY_INTEGRATION_BASE_URL=http://frontend:5173 \
  frontend npm run test:integration

# FastAPI checks
docker compose exec ai-service ruff check .
docker compose exec ai-service pytest

# PostgreSQL migration status
docker compose exec frontend npm run db:status
```

## Authentication and Security

- The browser receives a random session token in an `HttpOnly` cookie.
- Only a SHA-256 hash of that token is stored in PostgreSQL.
- The cookie is `SameSite=Lax` and `Secure` in production.
- Every product query includes the authenticated user's ID.
- Cross-user object access returns `404`.
- Receipt uploads are restricted by MIME signature, size, and pixel count.
- FastAPI endpoints require `AI_INTERNAL_API_TOKEN`.
- AI report and receipt upload routes have database-backed rate limits.

## Receipt Upload Modes

Local development uses a normal multipart request to Next.js:

```dotenv
NEXT_PUBLIC_RECEIPT_UPLOAD_MODE=server
RECEIPT_STORAGE_DRIVER=local
BUDGETLY_QUEUE_DRIVER=inline
```

Production uses a browser-to-Vercel-Blob upload and then finalizes the upload
through an authenticated Next.js route. This avoids the Vercel Function request
body limit:

```dotenv
NEXT_PUBLIC_RECEIPT_UPLOAD_MODE=blob
RECEIPT_STORAGE_DRIVER=vercel-blob
BUDGETLY_QUEUE_DRIVER=inline
```

Mobile browsers can open the rear camera because the receipt input uses
`capture="environment"`. Desktop browsers normally show a file picker.

## Deployment

The practical production layout uses two Vercel projects from this repository:

1. Project root `frontend` for the Next.js application and API.
2. Project root `ai-service` for FastAPI.

Connect Neon PostgreSQL to the frontend project. Connect the same private
Vercel Blob store to both projects so FastAPI can read receipt images without
passing them through a Function request body. Set `AI_SERVICE_URL` to the
FastAPI deployment URL and configure the same `AI_INTERNAL_API_TOKEN` in both
projects.

See [Vercel Deployment](docs/vercel.md) for the complete environment and
deployment checklist.

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Database](docs/database.md)
- [Docker](docs/docker.md)
- [AI Service](docs/ai-service.md)
- [Vercel Deployment](docs/vercel.md)
- [QA Checklist](docs/qa-checklist.md)
- [Roadmap](docs/roadmap.md)
- [Migration Status](docs/migration-plan.md)

## Data Migration Note

The new PostgreSQL database starts independently from the legacy MySQL
database. Existing local test data is not copied automatically. Keep the legacy
containers and MySQL volume until any required production data has been
exported and validated.
