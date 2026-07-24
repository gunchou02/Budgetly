# Docker Development

## Prerequisites

- Docker Desktop with Compose v2
- approximately 6 GB of free memory for the complete legacy and target stack
- ports `5173`, `8000`, `8080`, `5432`, `3306`, and `6379` available, or custom
  values in `.env`

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

Wait until PostgreSQL, FastAPI, and the frontend are healthy or ready.

```bash
curl http://127.0.0.1:5173/api/health
curl http://127.0.0.1:8000/health
```

Open `http://127.0.0.1:5173`.

## Services

| Service | Purpose | Primary target? |
| --- | --- | --- |
| `frontend` | Next.js UI, API, Prisma, receipt orchestration | Yes |
| `postgres` | Target local database | Yes |
| `ai-service` | FastAPI OCR and AI work | Yes |
| `backend` | Legacy Laravel API | No |
| `worker` | Legacy Laravel receipt worker | No |
| `nginx` | Legacy Laravel HTTP entry point | No |
| `mysql` | Legacy database | No |
| `redis` | Legacy queue and cache | No |

The legacy services remain available during migration and can be removed after
data migration and rollback requirements are resolved.

## Common Commands

```bash
# Follow target-stack logs
docker compose logs -f frontend postgres ai-service

# Restart one service
docker compose restart frontend

# Rebuild after Dockerfile or dependency changes
docker compose up -d --build frontend ai-service

# Stop while preserving volumes
docker compose down

# Show resolved Compose configuration
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

Create a new migration with a normal local Node process or a one-off frontend
container connected to PostgreSQL. Commit both `schema.prisma` and the generated
migration SQL.

## Verification Commands

```bash
# Next.js static checks and unit tests
docker compose run --rm --no-deps frontend npm run lint
docker compose run --rm --no-deps frontend npm run test:run
docker compose run --rm --no-deps frontend npm run build

# End-to-end API integration against the running stack
docker compose run --rm --no-deps \
  -e BUDGETLY_INTEGRATION_BASE_URL=http://frontend:5173 \
  frontend npm run test:integration

# FastAPI
docker compose exec ai-service ruff check .
docker compose exec ai-service pytest

# Legacy Laravel regression while it remains in the repository
docker compose exec backend vendor/bin/phpunit
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

Local receipt behavior is intentionally cost-free:

```dotenv
NEXT_PUBLIC_RECEIPT_UPLOAD_MODE=server
RECEIPT_STORAGE_DRIVER=local
BUDGETLY_QUEUE_DRIVER=inline
```

The Compose file passes those values directly to the frontend. Production
values are documented in [Vercel Deployment](vercel.md).

## Reset Local Data

`docker compose down` preserves data. To remove only the target PostgreSQL
database, inspect the volume name first:

```bash
docker volume ls
docker compose down
docker volume rm budgetly_postgres-data
docker compose up -d
```

Do not delete `mysql-data` until legacy data is confirmed unnecessary or has
been migrated.

## Troubleshooting

### Frontend starts before the schema exists

Check migration logs:

```bash
docker compose logs frontend
docker compose exec frontend npm run db:status
```

The startup command should contain `npm run db:deploy`.

### Receipt upload returns a validation error

Use JPEG, PNG, or WebP under 5 MB. Renaming a non-image file is rejected because
the server checks the actual image signature.

### Receipt remains `failed`

Inspect both services:

```bash
docker compose logs frontend ai-service
```

Confirm that both services use the same `AI_INTERNAL_API_TOKEN`. The UI exposes
a retry action for failed receipts.

### AI output looks synthetic

The local default provider is `fake`, so its receipt values are deterministic
test data and do not come from the uploaded image. Set the receipt provider to
`openai` and provide an API key to perform real extraction.

### A port is already allocated

Override it in root `.env`, for example:

```dotenv
FRONTEND_PORT=5174
POSTGRES_PORT=5433
```
