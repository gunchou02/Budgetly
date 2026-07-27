<p align="center">
  <img src="./frontend/public/brand/budgetly-mark.svg" width="88" height="88" alt="Budgetly logo" />
</p>

<h1 align="center">Budgetly</h1>

<p align="center">
  <strong>毎月のお金を、わかりやすく。</strong><br />
  A Japanese personal finance application for budgets, expenses, subscriptions,
  receipt OCR, and AI-assisted spending insights.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#local-development">Local setup</a> ·
  <a href="#testing">Testing</a> ·
  <a href="./docs/vercel.md">Deployment</a>
</p>

---

## Overview

Budgetly helps users understand how much they can still spend this month.
Instead of only recording transactions, it combines monthly budgets, recurring
costs, receipt capture, and concise Japanese insights in one responsive
workflow.

```text
Create account -> Set monthly budget -> Add or scan expenses
-> Review dashboard -> Understand spending patterns
```

## Product Preview

![Budgetly dashboard](./docs/images/dashboard-desktop.jpg)

## Features

| Area | What users can do |
| --- | --- |
| Monthly budget | Set one JPY budget per month and track usage and remaining money |
| Expenses | Create, edit, delete, filter, and review recent spending |
| Subscriptions | Manage recurring monthly costs and cancellation dates |
| Receipt capture | Upload an image or open the rear camera on supported mobile browsers |
| Receipt review | Correct merchant, date, amount, and category before creating an expense |
| Reports | Compare category totals and all 12 months of a selected year |
| AI insights | Receive structured Japanese summaries and practical recommendations |
| Responsive UI | Use the same core workflow on desktop, tablet, and mobile |

## Architecture

Budgetly uses Next.js as the product and security boundary. Python is separated
only for image, OCR, and AI workloads where its ecosystem is useful.

```mermaid
flowchart LR
    Browser["Browser / Mobile camera"]
    Next["Next.js<br/>UI + Route Handlers"]
    DB["PostgreSQL / Neon"]
    Blob["Private Vercel Blob"]
    Python["FastAPI<br/>OCR + AI"]
    OpenAI["OpenAI API"]

    Browser -->|"HttpOnly session"| Next
    Browser -->|"Production receipt upload"| Blob
    Next -->|"Prisma"| DB
    Next -->|"Scoped receipt state"| Blob
    Next -->|"Internal token"| Python
    Python -->|"Private receipt read"| Blob
    Python --> OpenAI
```

### Responsibility Boundary

**Next.js**

- authentication, sessions, authorization, and user ownership
- categories, budgets, expenses, and subscriptions
- deterministic dashboard and report calculations
- receipt state, confirmation, storage metadata, and retries
- AI rate limiting, request shaping, and result caching

**FastAPI**

- receipt image validation and normalization
- OCR and multimodal extraction
- OpenAI structured-output validation
- natural-language spending insights

FastAPI never queries product tables directly. Next.js loads only the
authenticated user's data and sends a bounded internal request.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web application | Next.js 16, React 19, TypeScript |
| UI | CSS design tokens, Recharts, Lucide |
| Main API | Next.js App Router Route Handlers |
| Validation | Zod, Pydantic |
| Authentication | Hashed server-side session + `HttpOnly` cookie |
| Database | PostgreSQL 17, Prisma 7, Neon adapter |
| AI service | Python 3.14, FastAPI, Pillow, OpenAI SDK |
| File storage | Local private volume / private Vercel Blob |
| Background work | Next.js `after()` / optional Vercel Queues |
| Development | Docker Compose |
| Production target | Vercel + Neon |

## Project Structure

```text
Budgetly/
├── frontend/
│   ├── prisma/               # PostgreSQL schema and migrations
│   ├── src/app/api/          # Browser-facing Route Handlers
│   ├── src/components/       # Product UI and receipt workflow
│   ├── src/server/           # Auth, reports, storage, queue, AI client
│   └── tests/                # Unit and API integration tests
├── ai-service/
│   ├── app/routers/          # Internal FastAPI endpoints
│   ├── app/providers/        # Fake and OpenAI providers
│   ├── app/services/         # Image and Blob processing
│   └── tests/                # Provider and API tests
├── docs/
├── docker-compose.yml
└── README.md
```

## Local Development

### Requirements

- Docker Desktop
- Docker Compose v2

### Start

```bash
cp .env.example .env
docker compose up -d --build
```

The frontend container installs dependencies and runs committed Prisma
migrations before starting Next.js.

| Service | URL |
| --- | --- |
| Budgetly | http://127.0.0.1:5173 |
| Main API health | http://127.0.0.1:5173/api/health |
| FastAPI health | http://127.0.0.1:8000/health |
| FastAPI readiness | http://127.0.0.1:8000/ready |
| PostgreSQL | `127.0.0.1:5432` |

### AI Provider Modes

Local development uses deterministic fake providers. It does not consume
OpenAI credits.

```dotenv
AI_RECEIPT_PROVIDER=fake
AI_REPORT_PROVIDER=fake
```

Real extraction and generated reports are enabled independently:

```dotenv
AI_RECEIPT_PROVIDER=openai
AI_REPORT_PROVIDER=openai
OPENAI_API_KEY=your-key
AI_OPENAI_MODEL=gpt-4o-mini
```

After changing AI settings:

```bash
docker compose up -d --build ai-service
```

## Testing

| Check | Command |
| --- | --- |
| Next.js lint | `docker compose run --rm --no-deps frontend npm run lint` |
| TypeScript | `docker compose run --rm --no-deps frontend npm run typecheck` |
| Unit tests | `docker compose run --rm --no-deps frontend npm run test:run` |
| Production build | `docker compose run --rm --no-deps frontend npm run build` |
| API integration | `docker compose run --rm --no-deps -e BUDGETLY_INTEGRATION_BASE_URL=http://frontend:5173 frontend npm run test:integration` |
| FastAPI lint | `docker compose exec ai-service ruff check .` |
| FastAPI tests | `docker compose exec ai-service pytest` |
| Migration status | `docker compose exec frontend npm run db:status` |

The integration scenario covers registration, default categories, budget
uniqueness, expense and subscription totals, cross-user access denial, AI
insights, receipt analysis, one-time confirmation, and image cleanup.

## Security Decisions

- Passwords use bcrypt and enforce its 72-byte safe input boundary.
- Session tokens are random; only SHA-256 hashes are stored in PostgreSQL.
- Production cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- Every product query includes the authenticated user's ID.
- Cross-user object IDs return `404`.
- PostgreSQL constraints protect amounts, dates, uniqueness, and file size.
- Receipt files are checked by actual image type, size, dimensions, and MIME.
- FastAPI analysis routes require a shared internal service token.
- AI reports and receipt uploads use database-backed rate limits.
- OpenAI is optional, cacheable, and disabled by default locally.

## Deployment

The production design uses two Vercel projects from this repository:

1. `frontend` for Next.js and the browser-facing API
2. `ai-service` for the internal FastAPI function

Neon is connected to the frontend project. The same private Vercel Blob store
is connected to both projects so FastAPI can read receipt images without
forwarding large multipart bodies between Functions.

See [Vercel deployment](./docs/vercel.md) for environment variables, migration
order, Blob setup, queue options, smoke tests, and rollback guidance.

## Documentation

| Document | Contents |
| --- | --- |
| [Architecture](./docs/architecture.md) | Service boundaries and request flows |
| [API](./docs/api.md) | Browser API and internal FastAPI contracts |
| [Database](./docs/database.md) | Prisma models, constraints, and migrations |
| [Docker](./docs/docker.md) | Local environment and troubleshooting |
| [AI service](./docs/ai-service.md) | Providers, image processing, and contracts |
| [QA checklist](./docs/qa-checklist.md) | Automated and manual acceptance checks |
| [Roadmap](./docs/roadmap.md) | Completed work and next production phase |
