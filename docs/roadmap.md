# Roadmap

## Completed Product Phases

### Phase 0-9: Core Budgetly Product

- product planning and Laravel foundation
- authentication, categories, budgets, expenses, and subscriptions
- dashboard and deterministic reports
- React/Next.js user interface and UX polish
- Docker development environment

### Phase 10-15: AI and Receipt Foundation

- migration architecture design
- Next.js and TypeScript frontend migration
- FastAPI service foundation
- receipt domain and upload UI
- Redis queue in the legacy implementation
- fake and OpenAI OCR/report providers

### Phase 16: Next.js Full-Stack and PostgreSQL Migration

- Prisma and PostgreSQL/Neon schema
- Next.js Route Handlers for all main APIs
- secure cookie sessions
- dashboard and reports moved from Laravel
- receipt orchestration moved from Laravel
- PostgreSQL-backed cache and rate limiting
- frontend switched from bearer tokens to same-origin cookies

### Phase 17: Vercel-Ready Heavy API Split

- FastAPI kept as the Python compute/AI boundary
- private Vercel Blob direct-upload path
- inline and optional Vercel Queue processing
- separate Vercel project configuration for Next.js and FastAPI
- unit, integration, and visual verification
- architecture, API, database, Docker, and deployment documentation

## Next Phase

### Phase 18: Production Deployment and CI

1. Provision Neon and private Vercel Blob.
2. Deploy `ai-service` with fake providers.
3. Deploy `frontend` and apply Prisma migrations.
4. run authenticated CRUD and receipt smoke tests.
5. Add GitHub Actions for Next.js, FastAPI, Prisma, and legacy regression.
6. Configure production logs, function timeouts, and alerts.
7. Enable OpenAI with a spending limit after fake-provider acceptance.

Completion criteria:

- production login and all user-owned CRUD flows work;
- receipt upload works on desktop and a real mobile camera;
- a receipt can be reviewed and confirmed once;
- AI report failures degrade to a clear retryable state;
- CI blocks lint, type, migration, or test regressions;
- no legacy service is required by the production request path.

## Later Phases

### Phase 19: Data Migration and Legacy Removal

- decide whether MySQL test data can be discarded
- build and rehearse an importer when real data exists
- validate totals and ownership after import
- archive Laravel code only after the rollback period

### Phase 20: Production Hardening

- durable queue activation if receipt traffic requires it
- scheduled cleanup for expired sessions, caches, and rate-limit buckets
- observability dashboards and provider cost monitoring
- account recovery and email verification
- automated receipt quality evaluation dataset

### Phase 21: Product Expansion

- budget recommendations
- recurring-expense anomaly detection
- export and account deletion
- optional iOS client using the same Next.js API

## Current Scope Guardrails

- Navigation remains unchanged.
- Amount-entry UX remains unchanged.
- JPY remains integer-based.
- Next.js owns authorization and financial truth.
- Python is used for genuinely heavy, image, OCR, or AI workloads.
- OpenAI remains optional and billable.
