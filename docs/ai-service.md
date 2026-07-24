# AI Service

`ai-service` is an internal FastAPI application for compute-heavy and
AI-oriented work. Next.js remains responsible for authentication, ownership,
database writes, and financial calculations.

## Responsibilities

- validate and normalize receipt images
- call a fake or OpenAI receipt extraction provider
- return structured merchant, date, amount, category, confidence, and OCR text
- turn pre-calculated monthly facts into structured Japanese insights
- expose stable, typed contracts independent of the selected provider

FastAPI does not connect to the Budgetly product database and is not called
directly by the browser.

## Authentication

Analysis routes require:

```text
X-Internal-Token: <AI_INTERNAL_API_TOKEN>
```

The same long random value must be configured in Next.js and FastAPI. The local
development value is not allowed when `AI_ENVIRONMENT` is neither `local` nor
`test`.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Process health |
| `GET` | `/ready` | No | Provider readiness |
| `POST` | `/v1/receipts/analyze` | Internal token | Receipt extraction |
| `POST` | `/v1/receipts/analyze-blob` | Internal token | Private Blob extraction |
| `POST` | `/v1/reports/analyze` | Internal token | Spending insight generation |

FastAPI also exposes OpenAPI documentation at `/docs` in normal development.

## Receipt Contract

The request is `multipart/form-data`:

- `image`: JPEG, PNG, or WebP file
- `payload`: JSON string

```json
{
  "job_id": "9c098337-c779-4ea1-8e1e-510e15ace33e",
  "image_key": "receipts/1/example.png",
  "mime_type": "image/png",
  "language": "ja",
  "category_candidates": [
    {
      "id": 1,
      "name": "食費"
    }
  ]
}
```

Response:

```json
{
  "provider": "fake",
  "merchant": "サンプルストア",
  "spent_at": "2026-07-24",
  "amount": 1280,
  "suggested_category_id": 1,
  "confidence": {
    "merchant": 0.94,
    "spent_at": 0.93,
    "amount": 0.96,
    "category": 0.9,
    "overall": 0.93
  },
  "extracted_text": "..."
}
```

The service verifies the declared MIME type against decoded image content,
limits input bytes and pixels, applies EXIF orientation, and resizes large
images before provider use.

In production, Next.js calls `/v1/receipts/analyze-blob` with the same payload
as JSON. `image_key` must exactly match:

```text
receipts/{numeric-user-id}/{job-id}.{jpg|png|webp}
```

FastAPI uses the official Vercel Python SDK and `BLOB_READ_WRITE_TOKEN` to
read that private object directly. The same Blob store must be connected to
both Vercel projects. This avoids forwarding image bytes through a second
Vercel Function request.

## Spending Report Contract

Next.js sends deterministic facts:

```json
{
  "period": "2026-07",
  "currency": "JPY",
  "budget_amount": 100000,
  "total_spent": 52700,
  "remaining_amount": 47300,
  "usage_rate": 52.7,
  "previous_month_total": 48100,
  "month_over_month_rate": 9.56,
  "subscription_total": 4500,
  "subscription_rate": 8.54,
  "categories": [
    {
      "name": "食費",
      "amount": 18000,
      "percentage": 34.16,
      "month_over_month_rate": 12.5
    }
  ]
}
```

FastAPI returns:

```json
{
  "provider": "fake",
  "period": "2026-07",
  "summary": "今月の支出状況...",
  "highlights": [
    {
      "type": "top_category",
      "title": "食費が最大",
      "description": "今月の支出で食費の割合が最も高いです。",
      "severity": "info"
    }
  ],
  "recommendations": [
    "外食回数を週単位で確認しましょう。"
  ]
}
```

The language model explains values supplied by Next.js; it does not recalculate
or write money.

## Providers

```dotenv
AI_RECEIPT_PROVIDER=fake
AI_REPORT_PROVIDER=fake
```

The fake providers are deterministic, free, and suitable for UI and integration
tests. Their receipt result is synthetic and will not match the uploaded image.

For real extraction and generated reports:

```dotenv
AI_RECEIPT_PROVIDER=openai
AI_REPORT_PROVIDER=openai
AI_OPENAI_API_KEY=your-key
AI_OPENAI_MODEL=gpt-4o-mini
AI_OPENAI_TIMEOUT_SECONDS=20
AI_OPENAI_MAX_RETRIES=0
```

OpenAI usage is billable. Enable either provider independently to control cost.
The app should keep editable receipt confirmation even when confidence is high.

## Local Verification

```bash
docker compose up -d ai-service
docker compose exec ai-service ruff check .
docker compose exec ai-service pytest
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/ready
```

The test suite covers authentication, validation, image preprocessing, fake
providers, OpenAI structured requests, timeout mapping, and safe errors.

## Vercel

Create a separate Vercel project with root directory `ai-service`.
`ai-service/vercel.json` configures `app/main.py` with a 60-second maximum
duration.

Required production variables:

```dotenv
AI_ENVIRONMENT=production
AI_INTERNAL_API_TOKEN=<same-secret-as-frontend>
BLOB_READ_WRITE_TOKEN=<token-for-the-same-private-blob-store>
AI_RECEIPT_PROVIDER=openai
AI_REPORT_PROVIDER=openai
AI_OPENAI_API_KEY=<secret>
AI_OPENAI_MODEL=gpt-4o-mini
```

Set the resulting deployment URL as `AI_SERVICE_URL` in the frontend project.
