# Docker Development

## Prerequisites

- Docker Desktop with Docker Compose v2
- Available host ports: `5173`, `8080`, and `3306`

PHP, Composer, Node.js, npm, Nginx, and MySQL do not need to be installed on the host when using this workflow.

## First Start

Run these commands from the project root:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

The backend container performs the following idempotent initialization before PHP-FPM starts:

1. Creates `backend/.env` from `backend/.env.example` when it is missing.
2. Installs Composer dependencies in the `backend-vendor` volume.
3. Generates `APP_KEY` when it is missing.
4. Runs database migrations and the default category seeder.

The frontend container installs the exact packages from `package-lock.json` in the `frontend-node-modules` volume before starting the Next.js development server.

Default endpoints:

```txt
Frontend: http://127.0.0.1:5173
API:      http://127.0.0.1:8080/api
Health:   http://127.0.0.1:8080/api/health
```

## Common Commands

```bash
# Follow all logs
docker compose logs -f

# Follow one service
docker compose logs -f backend

# Run backend tests
docker compose exec backend composer test

# Run the frontend production build
docker compose exec frontend npm run build

# Stop containers while preserving database data
docker compose down

# Rebuild images after changing a Dockerfile
docker compose up -d --build
```

## Configuration

Docker Compose reads the root `.env` file. Copy `.env.example` and change values only when the default ports or local credentials conflict with another project.

```dotenv
API_PORT=8080
FRONTEND_PORT=5173
MYSQL_PORT=3306
DB_DATABASE=budgetly
DB_USERNAME=budgetly
DB_PASSWORD=secret
DB_ROOT_PASSWORD=root
```

These credentials are development defaults. Do not reuse them in staging or production.

When `FRONTEND_PORT` or `API_PORT` is changed, also update `frontend/.env` so the browser uses the matching API URL:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api
```

## Reset Local Data

The following command deletes the Docker-managed MySQL data and all local application records:

```bash
docker compose down -v
docker compose up -d --build
```

Use it only when a clean local database is intended.

## Troubleshooting

### API returns 502 during the first start

Composer installation and database migrations may still be running. Check the backend log and wait until `docker compose ps` reports the backend as healthy:

```bash
docker compose logs -f backend
```

### A port is already allocated

Change the conflicting value in the root `.env`, then recreate the containers:

```bash
docker compose down
docker compose up -d
```

### Dependencies are out of date

Recreate the dependency volumes after changing lock files:

```bash
docker compose down
docker volume rm budgetly_backend-vendor budgetly_frontend-node-modules
docker compose up -d --build
```

The volume names assume the default `COMPOSE_PROJECT_NAME=budgetly`.
