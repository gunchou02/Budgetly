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

## Completed Production Phase

### Phase 19: Production Deployment and CI

- GitHub Actions component and API integration jobs
- npm and Python production dependency audits
- weekly Dependabot updates for npm, pip, Actions, and Docker
- Prisma and Next.js security patch updates
- Neon PostgreSQL and private Vercel Blob in Singapore
- separate `budgetly-web` and `budgetly-ai` Vercel deployments in `sin1`
- GitHub-connected production deployments from `main`
- Production-scoped secrets and committed Prisma migrations
- authenticated CRUD, ownership, report, and receipt integration smoke test
- desktop and mobile responsive browser verification
- fake AI providers retained to prevent unplanned API cost

## Next Phase

### Phase 20: Production Hardening

1. Give Preview deployments an isolated Neon branch and non-production storage
   configuration.
2. Add Playwright end-to-end coverage for registration, login, budget entry,
   and receipt review.
3. Add Vercel runtime monitoring, error alerts, and a documented Neon restore
   drill.
4. Verify rear-camera receipt capture on a physical mobile device.
5. Add scheduled cleanup for expired sessions, caches, and rate-limit buckets.
6. Enable OpenAI only after setting provider usage and spending limits.
7. Enable durable queues only when receipt volume requires retry guarantees.

Completion criteria:

- a Preview deployment cannot access Production data or files;
- GitHub pushes produce observable, reproducible deployments;
- core browser flows pass automated E2E checks;
- runtime failures and database recovery have documented operating procedures;
- physical mobile receipt capture is accepted;
- enabling billable AI requires an explicit cost-control change.

## Later Phases

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
