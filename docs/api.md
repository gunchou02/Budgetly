# API Documentation

## Base URL

The browser-facing API is served by the Next.js application:

```text
Local:      http://127.0.0.1:5173/api
Production: https://<frontend-domain>/api
```

Successful resource responses use:

```json
{
  "data": {}
}
```

## Authentication

Authentication uses the `budgetly_session` `HttpOnly` cookie. Browser requests
must include credentials; the application Axios client already sets
`withCredentials: true`.

Do not store a bearer token in `localStorage` and do not send an
`Authorization` header to the Next.js API.

### `POST /register`

```json
{
  "name": "Budgetly User",
  "email": "user@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

Returns `201`, sets the session cookie, and creates the user's default Japanese
categories. Passwords must contain at least 8 characters and no more than 72
UTF-8 bytes, matching bcrypt's safe input boundary.

### `POST /login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Returns `200` and sets the session cookie.

### `POST /guest`

Send an exact empty JSON object with `Content-Type: application/json`:

```json
{}
```

Returns `201`, creates an isolated temporary user and session, and sets the
session cookie to expire in 24 hours. Guest entry returns `409` when a session
already exists, `415` for a non-JSON request, and `429` when the address limit
is exceeded. Guests can use budgets, manual expenses, subscriptions, the
dashboard, and deterministic reports; receipt OCR and generated AI insights
require a member account.

### `POST /logout`

Send an exact empty JSON object with `Content-Type: application/json`:

```json
{}
```

Member logout deletes the current database session. Guest logout deletes the
temporary user and all guest-owned database records. Both expire the cookie.

### `GET /me`

Returns the authenticated public user:

```json
{
  "data": {
    "id": 1,
    "name": "ゲスト",
    "email": null,
    "is_guest": true,
    "guest_expires_at": "2026-08-10T03:15:00.000Z"
  }
}
```

Member responses use the registered email, `is_guest: false`, and
`guest_expires_at: null`.

## Errors

```json
{
  "message": "Input is invalid.",
  "errors": {
    "amount": ["Amount must be a positive integer."]
  }
}
```

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON or malformed request |
| `401` | Missing or expired session |
| `403` | Authenticated account cannot use a member-only feature |
| `404` | Missing resource or resource owned by another user |
| `409` | Receipt state or idempotency conflict |
| `413` | Receipt image exceeds the upload size limit |
| `415` | Endpoint requires an `application/json` request |
| `422` | Validation or unique-domain conflict |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |
| `502` | FastAPI or AI provider returned an invalid response |
| `503` | FastAPI or storage dependency unavailable |

Validation messages returned by the product API are Japanese.

## Health

### `GET /health`

Public. Returns service name, Japanese locale, and `Asia/Tokyo` time zone.

## Categories

All category routes require authentication.

### `GET /categories`

Returns the user's categories ordered by `sort_order`.

### `POST /categories`

```json
{
  "name": "ペット",
  "type": "expense"
}
```

The server assigns a display color, sort order, and `is_default=false`.

## Monthly Budgets

### `GET /budgets?year=2026&month=7`

Returns the matching budget or `data: null`.

### `POST /budgets`

```json
{
  "year": 2026,
  "month": 7,
  "amount": 100000
}
```

Returns `201`. A user can have only one budget for the same year and month.

### `PUT /budgets/{budget}`

Uses the same payload as creation and updates only an owned budget.

## Expenses

### `GET /expenses`

Optional filters:

```text
year=2026
month=7
category_id=1
```

When both year and month are supplied, the result is limited to that month.

### `POST /expenses`

```json
{
  "category_id": 1,
  "title": "ランチ",
  "amount": 1200,
  "spent_at": "2026-07-24",
  "memo": ""
}
```

The category must belong to the authenticated user.

### `GET /expenses/{expense}`

Returns one owned expense.

### `PUT /expenses/{expense}`

Uses the creation payload.

### `DELETE /expenses/{expense}`

Returns `204`.

## Subscriptions

### `GET /subscriptions`

Optional filters:

```text
status=active|canceled|all
category_id=1
```

### `POST /subscriptions`

```json
{
  "category_id": 10,
  "name": "Video Service",
  "amount": 1500,
  "billing_cycle": "monthly",
  "billing_day": 10,
  "started_at": "2026-01-01",
  "canceled_at": null,
  "memo": ""
}
```

### `GET /subscriptions/{subscription}`

Returns one owned subscription.

### `PUT /subscriptions/{subscription}`

Uses the creation payload.

### `PATCH /subscriptions/{subscription}/cancel`

```json
{
  "canceled_at": "2026-07-24"
}
```

An omitted or null date uses the application's current date.

### `DELETE /subscriptions/{subscription}`

Returns `204`.

## Dashboard and Reports

### `GET /dashboard?year=2026&month=7`

Returns the budget, expense total, active subscription total, total spent,
remaining amount, category breakdown, recent expenses, and subscription list.

### `GET /reports/categories?year=2026&month=7`

Returns deterministic category totals and percentages.

### `GET /reports/monthly?year=2026`

Returns all 12 monthly totals for the selected year.

### `GET /reports/insights?year=2026&month=7`

Returns a structured Japanese AI spending report. Next.js calculates the
financial facts, rate-limits the request, calls FastAPI, validates the response,
and caches it. A member account is required. The fake provider is used by
default in local development.

## Receipts

Allowed images are JPEG, PNG, and WebP up to 5 MB and 40 megapixels.
All receipt routes require a member account.

### `POST /receipts`

Local/server upload endpoint. Send `multipart/form-data` with an `image` field.
Returns `201` with a receipt in `queued`, `processing`, or
`review_required` state.

### `POST /receipts/blob-upload`

Production browser upload handshake used by `@vercel/blob/client`. It issues a
short-lived token only for an authenticated user's path:

```text
receipts/{userId}/{jobId}.{jpg|png|webp}
```

Token issuance is limited per minute and per day for both the member and client
address. This route is part of the frontend upload implementation and should
normally not be called manually.

### `POST /receipts/blob`

Finalizes a direct Blob upload:

```json
{
  "job_id": "9c098337-c779-4ea1-8e1e-510e15ace33e",
  "pathname": "receipts/1/9c098337-c779-4ea1-8e1e-510e15ace33e.png",
  "original_name": "receipt.png"
}
```

Next.js verifies ownership and validates the actual private Blob bytes before
creating the receipt.

### `GET /receipts/{receipt}`

Polls status and returns the analysis when ready.

### `POST /receipts/{receipt}/retry`

Requeues an owned `failed` receipt.

### `POST /receipts/{receipt}/confirm`

```json
{
  "category_id": 1,
  "title": "サンプル食堂",
  "amount": 3000,
  "spent_at": "2026-07-16",
  "memo": ""
}
```

Creates exactly one expense transactionally and changes the receipt to
`confirmed`. A repeated confirmation returns the existing linked result.

### `DELETE /receipts/{receipt}`

Deletes the private image and receipt metadata. A linked expense remains a
normal expense record.

## Internal FastAPI

FastAPI is called only by Next.js and requires:

```text
X-Internal-Token: <AI_INTERNAL_API_TOKEN>
```

Internal endpoints:

```text
GET  /health
POST /v1/receipts/analyze
POST /v1/receipts/analyze-blob
POST /v1/reports/analyze
```

See [AI Service](ai-service.md) for its request and response contracts.
