# Docker Development

Budgetly runs as three local services: Next.js, FastAPI, and PostgreSQL.
Docker Compose provides the same service boundaries used by the production
design while keeping local AI usage cost-free by default.

## Prerequisites

- Docker Desktop with Compose v2
- approximately 3 GB of free memory
- ports `5173`, `8000`, and `5432`, or custom values in `.env`

## First Start

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

The frontend container performs:

1. `npm ci`
2. `prisma migrate deploy`
3. `next dev --hostname 0.0.0.0 --port 5173`

Check both application health endpoints:

```bash
curl http://127.0.0.1:5173/api/health
curl http://127.0.0.1:8000/health
```

Open `http://127.0.0.1:5173`.

## Services

| Service | Purpose | Port |
| --- | --- | --- |
| `frontend` | Next.js UI, Route Handlers, Prisma, and receipt orchestration | `5173` |
| `ai-service` | FastAPI receipt extraction and spending insights | `8000` |
| `postgres` | PostgreSQL source of truth | `5432` |

## Common Commands

```bash
# Follow all application logs
docker compose logs -f frontend ai-service postgres

# Restart one service
docker compose restart frontend

# Rebuild after dependency or container changes
docker compose up -d --build frontend ai-service

# Stop while preserving volumes
docker compose down

# Show the resolved configuration
docker compose config
```

## Database Commands

```bash
# Migration status
docker compose exec frontend npm run db:status

# Apply committed migrations
docker compose exec frontend npm run db:deploy

# Format the Prisma schema
docker compose exec frontend npx prisma format

# PostgreSQL shell
docker compose exec postgres \
  psql -U budgetly -d budgetly
```

After changing `frontend/prisma/schema.prisma`, create and review a Prisma
migration. Commit both the schema and generated SQL. Production changes use
`prisma migrate deploy`; do not use `prisma db push` as a deployment shortcut.

## Verification Commands

```bash
# Next.js checks
docker compose run --rm --no-deps frontend npm run lint
docker compose run --rm --no-deps frontend npm run typecheck
docker compose run --rm --no-deps frontend npm run test:run
docker compose run --rm --no-deps frontend npm run build
docker compose run --rm --no-deps \
  frontend npm audit --omit=dev --audit-level=high

# API integration against the running stack
docker compose run --rm --no-deps \
  -e BUDGETLY_INTEGRATION_BASE_URL=http://frontend:5173 \
  frontend npm run test:integration

# FastAPI checks
docker compose exec ai-service ruff check .
docker compose exec ai-service pytest
docker compose exec ai-service python -m pip check
docker compose exec ai-service \
  pip-audit --cache-dir /tmp/pip-audit -r requirements.txt
```

## Configuration

Important root `.env` values:

```dotenv
FRONTEND_PORT=5173
AI_PORT=8000
POSTGRES_PORT=5432
POSTGRES_DB=budgetly
POSTGRES_USER=budgetly
POSTGRES_PASSWORD=secret
AI_INTERNAL_API_TOKEN=local-ai-secret
AI_RECEIPT_PROVIDER=fake
AI_REPORT_PROVIDER=fake
```

The local receipt pipeline uses private container storage and post-response
processing:

```dotenv
NEXT_PUBLIC_RECEIPT_UPLOAD_MODE=server
RECEIPT_STORAGE_DRIVER=local
BUDGETLY_QUEUE_DRIVER=inline
```

Production values and managed storage options are documented in
[Vercel Deployment](vercel.md).

## Reset Local Data

`docker compose down` preserves PostgreSQL and receipt files. To reset a local
development database, inspect the exact volume name before deleting it:

```bash
docker volume ls
docker compose down
docker volume rm budgetly_postgres-data
docker compose up -d
```

This operation permanently removes local accounts and finance records.

## Troubleshooting

### Frontend starts before the schema exists

```bash
docker compose logs frontend
docker compose exec frontend npm run db:status
```

The startup command should contain `npm run db:deploy`.

### Receipt upload returns a validation error

Use JPEG, PNG, or WebP under 5 MB. Renaming another file type is rejected
because the server inspects the actual image bytes.

### Receipt remains `failed`

```bash
docker compose logs frontend ai-service
```

Confirm that both services use the same `AI_INTERNAL_API_TOKEN`. The receipt UI
provides a retry action after a processing failure.

### AI output looks synthetic

The local default provider is `fake`; it returns deterministic test values and
does not inspect receipt text. Set `AI_RECEIPT_PROVIDER=openai`, provide
`OPENAI_API_KEY`, and rebuild `ai-service` for real model extraction.

### A port is already allocated

Override the host port in root `.env`:

```dotenv
FRONTEND_PORT=5174
POSTGRES_PORT=5433
```
