# Vercel Deployment

## Production Layout

Use two Vercel projects from the same Git repository:

| Project | Root directory | Runtime |
| --- | --- | --- |
| `budgetly-web` | `frontend` | Next.js and Node.js Functions |
| `budgetly-ai` | `ai-service` | FastAPI Python Function |

This keeps deployments independently observable and avoids coupling the
browser-facing application to a long-running Python process.

Production data services:

- Neon PostgreSQL connected to `budgetly-web`
- private Vercel Blob connected to `budgetly-web`
- optional Vercel Queue topic `budgetly-receipts`
- OpenAI called only by `budgetly-ai`

## 1. Create FastAPI Project

Create a Vercel project from the repository and set root directory to
`ai-service`.

Configure:

```dotenv
AI_ENVIRONMENT=production
AI_INTERNAL_API_TOKEN=<long-random-shared-secret>
AI_RECEIPT_PROVIDER=fake
AI_REPORT_PROVIDER=fake
AI_RECEIPT_MAX_BYTES=5242880
AI_RECEIPT_MAX_PIXELS=40000000
AI_RECEIPT_MAX_DIMENSION=2048
AI_RECEIPT_JPEG_QUALITY=90
AI_OPENAI_MODEL=gpt-4o-mini
AI_OPENAI_TIMEOUT_SECONDS=20
AI_OPENAI_MAX_RETRIES=0
```

Do not configure `AI_OPENAI_API_KEY` until a real provider is enabled.
`BLOB_READ_WRITE_TOKEN` is added later by connecting the same private Blob
store used by the frontend.

Deploy and verify:

```text
GET https://<ai-domain>/health
GET https://<ai-domain>/ready
```

Save the AI deployment URL for the frontend configuration.

## 2. Create Neon Database

Create or connect a Neon PostgreSQL database to the frontend project.

Configure:

```dotenv
DATABASE_URL=<pooled-neon-url>
DIRECT_URL=<direct-or-unpooled-neon-url>
```

The running Next.js application can use the pooled URL. Prisma migration
commands should use the direct URL when Neon supplies one.

Before the first production application test, apply committed migrations from a
trusted release environment:

```bash
cd frontend
npm ci
DATABASE_URL="<pooled-url>" \
DIRECT_URL="<direct-url>" \
npm run db:deploy
```

Do not run development migrations or `prisma db push` against production.

## 3. Create Frontend Project

Create a second Vercel project with root directory `frontend`.

Required variables:

```dotenv
DATABASE_URL=<pooled-neon-url>
DIRECT_URL=<direct-or-unpooled-neon-url>

AI_SERVICE_URL=https://<ai-domain>
AI_INTERNAL_API_TOKEN=<same-secret-as-ai-project>

NEXT_PUBLIC_RECEIPT_UPLOAD_MODE=blob
RECEIPT_STORAGE_DRIVER=vercel-blob
BUDGETLY_QUEUE_DRIVER=inline
```

Connect a private Vercel Blob store to the frontend project. Then connect that
same store to the FastAPI project. Vercel supplies `BLOB_READ_WRITE_TOKEN` to
both projects:

```dotenv
BLOB_READ_WRITE_TOKEN=<managed-secret>
```

FastAPI uses the official Python SDK to read the private image directly.
Next.js sends only a small JSON payload containing the authenticated, scoped
Blob pathname. This avoids the 4.5 MB Vercel Function request-body limit
between the two services while preserving the 5 MB product upload limit.

`NEXT_PUBLIC_RECEIPT_UPLOAD_MODE` is embedded during the frontend build, so
redeploy after changing it.

## 4. Queue Choice

Start with:

```dotenv
BUDGETLY_QUEUE_DRIVER=inline
```

This uses Next.js `after()` and requires no queue resource. It is appropriate
for low-volume initial deployment, but it is not a durable job system.

When durable retries are required:

1. provision Vercel Queues;
2. keep the `budgetly-receipts` trigger from `frontend/vercel.json`;
3. configure the queue token supplied by Vercel;
4. set:

```dotenv
BUDGETLY_QUEUE_DRIVER=vercel
VERCEL_QUEUE_API_TOKEN=<managed-secret>
```

Redeploy and force one receipt failure to verify retry behavior before relying
on the queue in production.

## 5. Enable OpenAI

Keep fake providers through the first deployment smoke test. Then configure the
AI project:

```dotenv
AI_RECEIPT_PROVIDER=openai
AI_REPORT_PROVIDER=openai
AI_OPENAI_API_KEY=<secret>
AI_OPENAI_MODEL=gpt-4o-mini
```

Both features are independently switchable. Receipt OCR and report generation
consume API credits. Set provider-side usage limits and monitor request count
before enabling them for users.

## 6. Production Smoke Test

Verify in this order:

1. FastAPI `/health` and `/ready`.
2. Next.js `/api/health`.
3. registration, cookie persistence, reload, and logout.
4. categories and one monthly budget.
5. expense and subscription totals on the dashboard.
6. category, annual, and AI report endpoints.
7. desktop receipt file upload.
8. real mobile rear-camera capture.
9. receipt review, edit, and one-time confirmation.
10. cross-user IDs return `404`.
11. private Blob objects are not publicly readable.
12. application logs contain no credentials, session tokens, or full receipt
    contents.

## 7. CI Recommendation

Run these checks before production deployment:

```bash
cd frontend
npm ci
npm run lint
npm run test:run
npm run build

cd ../ai-service
ruff check .
pytest
```

Run `prisma migrate deploy` as a serialized release step, not concurrently in
every preview build.

## Rollback

- Disable OpenAI by switching both providers to `fake`.
- Switch `BUDGETLY_QUEUE_DRIVER` back to `inline` if the queue is unavailable.
- Roll back the Vercel frontend deployment only when its database schema is
  backward compatible.
- Restore the database from a verified Neon backup when a rollback requires
  data recovery; never depend on an application rollback to reverse a schema
  change.
