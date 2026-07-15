# Stack Migration Plan

The migration is incremental. Each phase must leave the existing Laravel and MySQL features testable before the next phase starts.

## Preserved Product Contract

The following behavior must remain unchanged during the frontend migration:

- Routes: `/login`, `/register`, `/dashboard`, `/budgets`, `/subscriptions`, `/reports`
- Navigation labels: `ホーム`, `予算`, `サブスク`, `分析`
- Laravel API endpoints and validation rules
- Sanctum Personal Access Token authentication during the initial migration
- JPY integer amounts and `Asia/Tokyo` dates
- User-scoped access control
- Existing dashboard, budget, expense, subscription, and report behavior

## Phase 10: Architecture and Migration Design

Deliverables:

- Target stack and service ownership documented.
- MySQL retention decision documented.
- Receipt OCR data flow and trust boundaries documented.
- Frontend migration constraints and later phases documented.

Completion criteria:

- Every datastore has one clear owner.
- The browser does not call FastAPI directly.
- Existing features and navigation have explicit preservation rules.
- AI failure cannot block ordinary financial CRUD.

## Phase 11: Next.js, TypeScript, and Tailwind Migration

Status: completed

Approach:

1. Create a Next.js App Router project in the existing `frontend` boundary.
2. Configure TypeScript strict mode and Tailwind design tokens.
3. Port the shared shell without changing navigation labels or destinations.
4. Port authentication and protected-route behavior.
5. Port dashboard, budget, subscription, and report pages one at a time.
6. Add typed API contracts and shared formatter utilities.
7. Remove Vite and React Router only after route parity is verified.

Completion criteria:

- All current routes and workflows pass manual QA.
- Production build and type checking pass.
- No remaining runtime dependency on Vite or React Router.
- Desktop and mobile layouts preserve the current navigation behavior.

Rollback rule:

- Do not delete the working Vite implementation until all page routes build and API smoke tests pass in the migration branch.

## Phase 12: FastAPI Foundation

Status: completed

- Add an isolated `ai-service` directory.
- Add health, readiness, structured error, and request ID handling.
- Define Pydantic request and response models.
- Add an OCR provider interface and deterministic fake implementation for tests.
- Add a spending report interface that converts Laravel-calculated aggregates into Japanese explanations.
- Add Docker service configuration as an internal application service with a development-only host port.

Completion criteria:

- FastAPI unit tests pass without external AI credentials.
- Laravel can reach the FastAPI health endpoint on the Docker network.
- No FastAPI code reads or writes MySQL directly.
- Protected analysis endpoints reject calls without the shared internal token.

## Phase 13: Receipt Domain and Laravel Integration

- Add receipt metadata and analysis migrations to Laravel.
- Add user-scoped receipt upload, status, confirmation, and deletion APIs.
- Store images locally in development through Laravel storage.
- Convert confirmed analysis into an expense transactionally.
- Add authorization, upload validation, and failure tests.

Completion criteria:

- A receipt cannot be read or confirmed by another user.
- Invalid and oversized files are rejected.
- Confirmation creates at most one expense.
- AI output always requires user review.

## Phase 14: Redis Queue

- Add Redis to Docker Compose.
- Add a Laravel queue worker that consumes OCR jobs and calls FastAPI.
- Expose durable job status through Laravel.
- Add retries with backoff and a terminal failed state.
- Keep Redis optional for non-AI APIs.

Completion criteria:

- Duplicate delivery does not create duplicate expenses.
- Worker restarts do not lose durable receipt state.
- Existing financial APIs work while the worker is stopped.

## Phase 15: OCR and AI Analysis

- Implement receipt image preprocessing.
- Integrate the selected Japanese OCR or multimodal provider.
- Extract merchant, date, total, and confidence values.
- Suggest only categories owned by the current user.
- Add fixtures for common Japanese receipt formats.
- Replace the fake spending report provider with a real AI provider while keeping calculations in Laravel.

Completion criteria:

- Provider secrets are supplied only through environment variables.
- Low-confidence fields are clearly marked for review.
- Provider timeout and malformed output are handled safely.
- OCR quality is measured against a small documented test set.

## Phase 16: Integrated Docker and QA

- Run Next.js, Laravel, FastAPI, MySQL, Redis, Nginx, and workers together.
- Add health checks and startup dependencies.
- Verify upload, processing, review, and confirmation end to end.
- Document local setup and troubleshooting.

## Phase 17: GitHub Actions

- Laravel test and formatting jobs.
- Next.js lint, type-check, and production build jobs.
- FastAPI lint and test jobs.
- Docker build validation.
- No deployment from unverified branches.

## Phase 18: AWS Deployment

- Select the final compute model after container resource measurements.
- Use RDS MySQL for the database and ElastiCache Redis for queues.
- Store private receipt images in S3.
- Configure HTTPS, secrets, logs, backups, and migration execution.
- Deploy only after the integrated Docker QA phase is stable.

## Key Risks

| Risk | Mitigation |
|---|---|
| Large frontend rewrite causes regressions | Port one route at a time and retain the working version until parity |
| OCR returns incorrect financial data | Require user confirmation and show confidence per field |
| AI service outage blocks the product | Keep AI asynchronous and isolate it from existing CRUD |
| Receipt images expose personal data | Private storage, short-lived access, retention policy, redacted logs |
| Queue retries duplicate records | Idempotency keys and transactional confirmation |
| Too many technologies slow delivery | Introduce one infrastructure dependency per phase |
