# Full-Stack Transition Status

## Decision

Budgetly now uses one TypeScript product boundary with a focused Python
compute service:

```text
Next.js full stack
+ Prisma
+ PostgreSQL / Neon
+ FastAPI for image and AI workloads
+ private Vercel Blob
+ optional Vercel Queues
+ Vercel deployment
```

The current navigation, Japanese interface, and amount-entry experience remain
unchanged.

## Preserved Product Contract

- Japanese interface and `Asia/Tokyo` date behavior
- JPY integer amounts
- user-scoped categories and monthly budgets
- expense and subscription CRUD
- dashboard and deterministic category/monthly reports
- receipt upload, editable review, and one-time confirmation
- AI-assisted monthly spending explanations
- mobile camera-compatible receipt input

## Completed

### PostgreSQL and Prisma

- complete schema for every product domain
- check, foreign-key, index, and unique constraints
- committed and reviewable migrations
- PostgreSQL 17 for local Docker
- Neon-compatible pooled runtime connection
- automatic `prisma migrate deploy` during local startup

### Next.js Product API

- Route Handlers for every browser-facing API
- Zod validation at request boundaries
- bcrypt password hashing and verification
- hashed server-side sessions in an `HttpOnly` cookie
- user ownership filters and cross-user `404` behavior
- deterministic dashboard and report calculations
- PostgreSQL-backed rate limiting and AI report caching

### Receipt Pipeline

- local multipart upload and private filesystem storage
- production direct upload to private Vercel Blob
- byte signature, MIME, file-size, and pixel validation
- direct FastAPI reads from private Blob
- explicit receipt states and retry behavior
- post-response processing with Next.js `after()`
- optional durable queue dispatch
- transactionally idempotent expense confirmation

### FastAPI

- fake and OpenAI receipt providers
- fake and OpenAI report providers
- receipt image preprocessing
- internal-token authentication
- typed request and response schemas
- separate Vercel function configuration

### Frontend

- same-origin `/api` client
- cookie-based authentication bootstrap
- existing navigation and amount-entry behavior preserved
- receipt image picker with rear-camera hint on supported mobile browsers
- production Blob upload mode
- responsive review and failure states

### Repository Cleanup

- one source of truth for browser-facing application behavior
- one PostgreSQL schema and migration history
- three-service local Compose stack
- current architecture reflected across README and project documentation

## Production Work Remaining

1. Provision Neon and connect pooled and direct database URLs.
2. Create separate Vercel projects for `frontend` and `ai-service`.
3. Connect one private Vercel Blob store to both projects.
4. Configure environment variables for Preview and Production.
5. Apply committed Prisma migrations to Neon.
6. Run the complete smoke test with fake providers.
7. Enable OpenAI only after usage and spending limits are configured.
8. Verify receipt capture on a physical mobile device.
9. Add production logs, alerts, and backup checks.

## Deployment Rollback

- Switch receipt and report providers to `fake` to stop external AI usage.
- Switch the queue driver to `inline` if durable dispatch is unavailable.
- Roll back application deployments only when migrations are backward
  compatible.
- Restore from a verified Neon backup when data recovery is required.
- Never treat a code rollback as a database rollback.

## Key Risks

| Risk | Mitigation |
| --- | --- |
| Authorization regression | Central `requireUser`, scoped queries, and ownership integration tests |
| Duplicate finance records | PostgreSQL constraints and transactional receipt confirmation |
| Function upload limits | Direct browser-to-Blob upload |
| AI cost growth | Fake defaults, rate limits, caching, and provider toggles |
| AI-generated amount errors | Deterministic calculations remain in Next.js |
| Background task interruption | Optional durable Vercel Queue |
| Migration failure | Serialized deploy step, reviewed SQL, and verified backups |
