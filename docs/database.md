# Database Documentation

Budgetly uses PostgreSQL through Prisma. The schema is defined in
`frontend/prisma/schema.prisma`, and production changes must be made through
committed Prisma migrations.

## Environments

| Environment | Database |
| --- | --- |
| Local Docker | PostgreSQL 17 |
| Production | Neon PostgreSQL |
| Legacy comparison | MySQL 8.4 |

`DATABASE_URL` is used by the running application. `DIRECT_URL` is available
for migration tooling when a provider gives separate pooled and direct
connections.

## Models

### `users`

Stores the user profile and bcrypt password hash.

Important constraints:

- `email` is unique.
- Deleting a user cascades to sessions and user-owned finance data.

### `sessions`

Stores server-side login sessions.

- The raw cookie token is never stored.
- `token_hash` contains a unique SHA-256 digest.
- `expires_at` is checked on every authenticated request.
- Sessions are deleted when their user is deleted.

### `categories`

Stores user-owned Japanese expense and fixed-cost categories.

- `(user_id, name)` is unique.
- `type` is `expense` or `fixed`.
- New accounts receive the configured default category set.
- `sort_order` controls display order.

### `monthly_budgets`

Stores one JPY budget per user and month.

- `(user_id, year, month)` is unique.
- `year` is limited to 2000 through 2100.
- `month` is limited to 1 through 12.
- `amount` is a non-negative integer.

### `expenses`

Stores individual spending records.

- `amount` is a positive JPY integer.
- `spent_at` is a PostgreSQL `date`.
- The selected category must belong to the same user.
- Indexes support monthly and category report queries.
- A receipt-confirmed expense can have one linked receipt.

### `subscriptions`

Stores recurring monthly costs.

- The supported billing cycle is currently `monthly`.
- `billing_day` is limited to 1 through 31.
- `started_at` and optional `canceled_at` define active months.
- Dashboard totals calculate the actual day within short months.

### `receipts`

Stores the receipt processing state and private storage metadata.

Status values:

```text
queued
processing
review_required
confirmed
failed
```

Important constraints:

- `job_id` is unique for idempotent upload finalization.
- `expense_id` is unique so one receipt cannot create multiple expenses.
- `file_size` must be positive and no larger than 5 MB.
- User, status, and creation time are indexed for polling and management.

### `receipt_analyses`

Stores one structured FastAPI result per receipt.

- merchant, date, amount, extracted text, and provider
- JSON confidence values for editable fields
- optional user-owned suggested category
- deleted automatically with its receipt

### `ai_report_caches`

Stores validated AI insight payloads.

- `(user_id, fingerprint)` is unique.
- `expires_at` supports time-based invalidation.
- Fingerprints change when the underlying monthly report input changes.

### `rate_limit_buckets`

Stores fixed-window counters for receipt upload and AI report routes.

- `key` is the primary key.
- PostgreSQL upsert logic increments counters atomically.
- `reset_at` defines the current window.

## Data Isolation

Database foreign keys prevent dangling records, but authorization is enforced
in application queries:

```ts
await db.expense.findFirst({
  where: {
    id: expenseId,
    userId: authenticatedUser.id,
  },
});
```

The same rule applies to categories, budgets, subscriptions, receipts, and
report inputs. A foreign user's ID is returned as `404`, not as a distinguishable
authorization error.

## Migrations

```bash
# Create a development migration after changing schema.prisma
cd frontend
npm run db:migrate

# Apply committed migrations in Docker or production
npm run db:deploy

# Show migration status
npm run db:status

# Load optional demo data
BUDGETLY_SEED_DEMO=true npm run db:seed
```

Do not use `prisma db push` for production schema changes. It bypasses the
reviewable migration history.

## Resetting Local PostgreSQL

This deletes local PostgreSQL data:

```bash
docker compose down
docker volume rm budgetly_postgres-data
docker compose up -d
```

The exact volume prefix can differ by Compose project name. Confirm it with
`docker volume ls` before deleting anything.

## Legacy Data

The new PostgreSQL schema does not automatically import legacy MySQL data.
Before removing MySQL:

1. decide whether the existing data is disposable test data or must be kept;
2. export and transform any required records;
3. validate row counts, ownership, totals, dates, and unique constraints;
4. keep a backup and rollback window;
5. remove legacy services only after acceptance.
