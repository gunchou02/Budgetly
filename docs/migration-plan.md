# Stack Migration Status

## Decision

Budgetly is moving from a split Next.js/Laravel application with MySQL to:

```text
Next.js full stack
+ Prisma
+ Neon PostgreSQL
+ FastAPI for heavy and AI workloads
+ Vercel Blob
+ optional Vercel Queues
+ Vercel deployment
```

The current navigation and amount-entry UX are preserved.

## Preserved Product Contract

- Japanese interface and `Asia/Tokyo` date behavior
- JPY integer amounts
- user-scoped categories and monthly budgets
- expense and subscription CRUD
- dashboard and category/monthly reports
- receipt upload, editable review, and one-time confirmation
- AI monthly spending explanation
- mobile camera-compatible receipt input

## Implemented

### PostgreSQL and Prisma

- complete Prisma schema for all product domains
- PostgreSQL check, foreign-key, index, and unique constraints
- committed initial migrations
- PostgreSQL 17 local Docker service
- Neon-compatible runtime adapter
- automatic `prisma migrate deploy` on local frontend startup

### Next.js Main API

- all browser-facing Laravel routes replaced by Route Handlers
- Zod request validation
- bcrypt password verification
- hashed server-side sessions in an `HttpOnly` cookie
- user ownership checks and cross-user `404` behavior
- deterministic dashboard and report calculations
- PostgreSQL-backed rate limiting and AI report caching

### Receipt Pipeline

- local multipart upload and private filesystem storage
- production direct upload to private Vercel Blob
- byte signature, MIME, size, and pixel validation
- direct FastAPI reads from private Blob to avoid Function body limits
- receipt status machine and retry behavior
- default post-response processing with `after()`
- optional Vercel Queue dispatch
- transactionally idempotent expense confirmation

### FastAPI

- fake and OpenAI receipt providers
- fake and OpenAI report providers
- receipt image preprocessing
- internal token authentication
- typed request and response schemas
- Vercel Python function configuration

### Frontend

- same-origin `/api` client
- cookie-based auth bootstrap
- legacy localStorage token removal
- existing navigation preserved
- existing amount-entry behavior preserved
- receipt image picker with rear-camera hint on supported mobile browsers
- Vercel Blob upload mode for production

### Verification

- Next.js unit tests for date, report, validation, and image rules
- full API integration test covering auth, ownership, CRUD, reports, and receipt
  confirmation
- FastAPI test suite
- legacy Laravel regression suite retained during transition
- desktop and mobile browser visual check

## Remaining Before Production

1. Create the Neon production database.
2. Create separate Vercel projects for `frontend` and `ai-service`.
3. Connect private Vercel Blob to the frontend.
4. configure and verify production environment variables.
5. Apply Prisma migrations to Neon.
6. Run a production smoke test with fake providers.
7. Enable OpenAI providers only after budget controls are configured.
8. Decide whether legacy MySQL contains data that must be migrated.
9. Add GitHub Actions checks before merging deployment changes.
10. Observe logs and error rates, then remove legacy services after a rollback
    window.

## Data Migration

This repository does not automatically copy MySQL records into PostgreSQL.

For disposable local data, start with an empty PostgreSQL database. For real
data, build and rehearse a one-time importer that:

- preserves user IDs or maps all foreign keys explicitly;
- rehashes or safely validates password compatibility;
- converts dates in `Asia/Tokyo` without timestamp drift;
- verifies per-user monthly totals before and after import;
- does not import raw Sanctum tokens;
- creates new server sessions only after users log in again.

## Rollback Strategy

The legacy Laravel, MySQL, Redis, Nginx, and worker services remain in the
repository and Compose file. Keep the MySQL volume untouched until:

- PostgreSQL data validation passes;
- the Vercel production flow is accepted;
- receipt analysis and report generation are observed in production;
- the agreed rollback period ends.

## Key Risks

| Risk | Mitigation |
| --- | --- |
| Authorization regression | Central `requireUser` and `userId` filters, ownership tests |
| Duplicate money records | PostgreSQL unique constraints and transactional receipt confirmation |
| Function upload limit | Direct browser-to-Blob upload |
| AI cost growth | Fake defaults, rate limits, cache, provider toggles |
| AI hallucinated amounts | Deterministic calculations remain in Next.js |
| Serverless background loss | Optional durable Vercel Queue |
| Legacy data loss | Keep MySQL volume and use a rehearsed importer |
