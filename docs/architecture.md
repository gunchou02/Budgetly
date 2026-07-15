# Target Architecture

BudgetlyのMVP機能を維持しながら、フロントエンドの型安全性とAI機能を追加するための目標アーキテクチャです。

## Technology Stack

| Area | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js, TypeScript | UI, routing, form state, API response typing |
| Styling | Tailwind CSS | Design tokens, responsive layout, component styling |
| Main API | Laravel | Authentication, authorization, CRUD, business rules |
| AI API | Python, FastAPI | OCR, receipt parsing, category suggestions, spending explanations |
| Database | MySQL 8.4 | Users, budgets, expenses, subscriptions, receipt metadata |
| Cache and Queue | Redis | AI job queue, job status cache, temporary data |
| Infrastructure | Docker, AWS, GitHub Actions | Local development, deployment, CI/CD |

MySQL remains the system database. A PostgreSQL migration is not planned.

## Service Boundaries

```txt
Browser
  |
  v
Next.js frontend
  |
  v
Laravel API --------------------> MySQL
  |
  +--------> Redis queue
                 |
                 v
         Laravel queue worker
                 |
                 +-------------> FastAPI ----> OCR / AI provider
                 |
                 +-------------> MySQL
```

The browser communicates only with Laravel for application data. FastAPI is an internal service and is not exposed as a public user API.

### Next.js

- Preserves the current routes and navigation structure.
- Renders the Japanese user interface.
- Validates forms for usability, while Laravel remains the source of validation truth.
- Uses shared TypeScript types for Laravel API responses.
- Displays OCR progress and requires user confirmation before expense creation.

### Laravel

- Owns authentication and user authorization.
- Owns all writes to MySQL.
- Validates uploaded file metadata before creating an OCR job.
- Checks that receipt, category, and expense records belong to the authenticated user.
- Converts confirmed receipt analysis into an expense in one database transaction.
- Handles AI timeout, retry, and failure states without breaking existing CRUD features.
- Uses its own queue worker to consume Redis jobs, call FastAPI, and persist results.

### FastAPI

- Receives only the image reference and a generated job identifier from trusted internal services.
- Extracts merchant name, purchase date, total amount, and receipt text.
- Returns structured analysis with confidence values.
- Converts Laravel-calculated monthly aggregates into Japanese summaries and recommendations.
- Does not authenticate end users and does not write directly to MySQL.
- Keeps OCR providers behind an adapter so the provider can be changed later.

FastAPI does not recalculate balances, usage rates, or category totals. Laravel remains responsible for exact financial calculations, and FastAPI only explains the validated aggregate values it receives.

### MySQL

- Remains the single source of truth for service data.
- Stores confirmed expense data and receipt analysis metadata.
- Does not store large original image binaries.

### Redis

- Is introduced first for OCR jobs and short-lived job state.
- Is not required for normal budget, expense, subscription, or report APIs.
- Must be treated as disposable storage; durable state remains in MySQL.

## Receipt OCR Flow

```txt
1. User uploads a receipt image.
2. Laravel validates ownership, MIME type, extension, and size.
3. Laravel stores the image and creates a receipt record with `queued` status.
4. Laravel sends an OCR job to Redis.
5. A Laravel queue worker consumes the job and calls FastAPI over the private Docker network.
6. FastAPI processes the image and returns structured fields with confidence scores.
7. The Laravel worker stores the analysis and changes the status to `review_required`.
8. The user reviews and edits the suggested values.
9. Laravel creates the expense and changes the receipt status to `confirmed`.
```

Planned receipt states:

```txt
queued -> processing -> review_required -> confirmed
                    \-> failed
```

Suggested analysis contract:

```json
{
  "merchant": "セブン-イレブン",
  "spent_at": "2026-07-13",
  "amount": 1280,
  "suggested_category_id": 3,
  "confidence": {
    "merchant": 0.96,
    "spent_at": 0.91,
    "amount": 0.98,
    "category": 0.84
  }
}
```

AI output is never saved directly as a confirmed expense. User confirmation is mandatory.

## Planned Laravel API Surface

```txt
POST /api/receipts
GET  /api/receipts/{receipt}
POST /api/receipts/{receipt}/retry
POST /api/receipts/{receipt}/confirm
DELETE /api/receipts/{receipt}
```

All endpoints use `auth:sanctum` and user-scoped queries. Exact request and response formats will be fixed when the receipt domain is implemented.

## Image Storage

- Local development: Docker-managed local storage.
- AWS: private S3 bucket with short-lived signed access.
- MySQL stores only object keys, metadata, status, and analysis results.
- Original images have a configurable retention period and can be deleted by the owner.

## Security and Reliability

- Accept only explicitly supported image formats and verify the actual MIME type.
- Apply upload size, pixel count, and request rate limits.
- Never trust filenames or OCR-generated values.
- Do not include receipt text, signed URLs, tokens, or personal data in application logs.
- Use internal service credentials between Laravel and FastAPI.
- Set connection and processing timeouts and limit retries.
- Keep existing financial CRUD available when Redis or FastAPI is unavailable.
- Record status transitions so failed jobs can be diagnosed and retried safely.

## Deliberate Non-Goals

- Replacing Laravel with FastAPI.
- Migrating MySQL to PostgreSQL.
- Allowing FastAPI to modify application tables.
- Automatically confirming AI-generated expenses.
- Redesigning the current navigation during the frontend migration.
