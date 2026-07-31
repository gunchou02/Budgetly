# Roadmap

## Completed Product Phases

### Phase 0-9: Core Budgetly Product

- product requirements and finance-domain design
- authentication, categories, budgets, expenses, and subscriptions
- dashboard and deterministic reports
- responsive React interface and UX refinement
- Docker development environment

### Phase 10-15: AI and Receipt Foundation

- Next.js and TypeScript application structure
- FastAPI compute service
- receipt domain, upload, review, retry, and confirmation UI
- fake and OpenAI receipt/report providers
- mobile camera-compatible image input

### Phase 16: Next.js Full-Stack and PostgreSQL

- Prisma schema and committed PostgreSQL migrations
- Route Handlers for the complete product API
- secure cookie sessions
- user-scoped dashboard and report calculations
- receipt orchestration and transactional confirmation
- database-backed cache and rate limiting

### Phase 17: Vercel-Ready AI Boundary

- FastAPI retained only for Python image and AI work
- private Vercel Blob direct-upload flow
- inline and optional durable queue processing
- separate Vercel project configuration
- unit, integration, and visual verification
- architecture, API, database, Docker, and deployment documentation

### Phase 18: Repository Consolidation

- one Next.js product and authorization boundary
- one PostgreSQL data model
- three-service local Compose stack
- obsolete runtime code, containers, volumes, and configuration removed
- project documentation synchronized with the final architecture

## Current Phase

### Phase 19: Production Deployment and CI

Completed:

- GitHub Actions component and API integration jobs
- npm and Python production dependency audits
- weekly Dependabot updates for npm, pip, Actions, and Docker
- Prisma and Next.js security patch updates

Remaining:

1. Provision Neon and private Vercel Blob.
2. Deploy `ai-service` with fake providers.
3. Deploy `frontend` and apply Prisma migrations.
4. Run authenticated CRUD and receipt smoke tests.
5. Configure production logs, function timeouts, backups, and alerts.
6. Verify receipt capture on desktop and a physical mobile device.
7. Enable OpenAI with a spending limit after fake-provider acceptance.

Completion criteria:

- production login and all user-owned CRUD flows work;
- receipt upload works on desktop and a physical mobile camera;
- a receipt can be reviewed and confirmed exactly once;
- AI failures degrade to a clear retryable state;
- CI blocks lint, type, migration, test, and build regressions;
- backups and environment variables are verified.

## Later Phases

### Phase 20: Production Hardening

- enable durable queues when receipt traffic requires them
- schedule cleanup for expired sessions, caches, and rate-limit buckets
- add observability dashboards and provider cost monitoring
- add account recovery and email verification
- build an automated receipt-quality evaluation dataset

### Phase 21: Product Expansion

- budget recommendations
- recurring-expense anomaly detection
- data export and account deletion
- optional native client using the same Next.js API

## Current Scope Guardrails

- Navigation remains unchanged.
- Amount-entry UX remains unchanged.
- JPY remains integer-based.
- Next.js owns authorization and financial truth.
- Python is used only for heavy image, OCR, or AI workloads.
- OpenAI remains optional and billable.
