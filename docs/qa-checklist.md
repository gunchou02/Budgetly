# QA Checklist

## Automated Gates

### Next.js

```bash
docker compose run --rm --no-deps frontend npm run lint
docker compose run --rm --no-deps frontend npm run test:run
docker compose run --rm --no-deps frontend npm run build
```

Expected:

- ESLint succeeds.
- Unit tests cover date calculations, reports, validation, and image rules.
- The production build has no missing environment or dynamic file-path warning.

### API Integration

```bash
docker compose run --rm --no-deps \
  -e BUDGETLY_INTEGRATION_BASE_URL=http://frontend:5173 \
  frontend npm run test:integration
```

Expected flow:

- unauthenticated `/api/me` returns `401`;
- registration sets an `HttpOnly` session;
- 19 default Japanese categories are created;
- duplicate monthly budget returns `422`;
- expense and subscription totals match the dashboard;
- fake AI report returns a structured response;
- another user's budget ID returns `404`;
- receipt upload reaches `review_required`;
- confirmation creates one linked expense.

### FastAPI

```bash
docker compose exec ai-service ruff check .
docker compose exec ai-service pytest
```

Expected:

- internal token enforcement works;
- malformed images and payloads are rejected safely;
- fake and OpenAI provider contracts pass;
- timeout and provider errors are mapped to stable responses.

### Legacy Regression

```bash
docker compose exec backend vendor/bin/phpunit
```

Run this while Laravel remains in the repository. It protects the rollback
implementation from accidental breakage.

## Manual Auth

- Register with a new email.
- Confirm the response cookie is `HttpOnly`.
- Reload and confirm `/api/me` restores the session.
- Log out and confirm protected routes return `401`.
- Attempt duplicate registration and an incorrect password.
- Confirm the old `budgetly_token` localStorage key is removed.

## Manual Ownership

Use two accounts:

- Account A creates a budget, expense, subscription, and receipt.
- Account B requests each Account A ID.
- Read, update, retry, confirm, and delete operations must return `404`.
- Account B reports must not include Account A amounts.

## Manual Finance

- Create, read, update, and delete expenses.
- Filter expenses by year, month, and category.
- Create and update one monthly budget.
- Verify a duplicate year/month budget is rejected.
- Create, update, cancel, and delete a subscription.
- Check billing day 29, 30, and 31 in short months.
- Check subscription start and cancellation month boundaries.
- Confirm negative, decimal, and oversized amounts are rejected.

## Manual Receipt

- Upload valid JPEG, PNG, and WebP files.
- Reject non-images renamed with an image extension.
- Reject files over 5 MB.
- Verify the selected image preview is not distorted.
- Poll through `queued` and `processing`.
- Review merchant, date, amount, category, and extracted text.
- Edit incorrect OCR values before confirmation.
- Confirm twice and verify only one expense exists.
- Force FastAPI unavailable, verify `failed`, then retry.
- Delete a receipt and confirm its private image is removed.

On a real mobile device:

- open the receipt picker;
- confirm the rear-camera option is offered;
- take a photo;
- confirm upload, preview, review, and expense creation work.

## Manual Reports

- Compare dashboard totals with raw expenses and active subscriptions.
- Verify a missing budget is represented consistently.
- Verify 12 annual report entries.
- Verify category percentages and zero-spend months.
- Call insights repeatedly and confirm caching/rate limiting.
- Verify a FastAPI failure does not alter deterministic money totals.

## UI Regression

- Keep the current desktop navigation unchanged.
- Keep the current mobile bottom navigation unchanged.
- Keep amount-entry formatting and behavior unchanged.
- Check 390 px mobile, tablet, and desktop widths.
- Confirm no labels, buttons, dialogs, or receipt previews overlap.
- Check loading, empty, validation, failed, and retry states.
- Confirm there are no browser console errors.

## Production Smoke Test

- `/api/health` and FastAPI `/ready` succeed.
- Neon migrations are current.
- registration and cookie persistence work on the production domain.
- private Blob objects cannot be fetched publicly.
- direct Blob receipt upload succeeds.
- FastAPI can read the same private Blob without a large multipart request.
- FastAPI accepts requests only with the internal token.
- logs do not contain passwords, session tokens, Blob tokens, or full receipt
  content.
