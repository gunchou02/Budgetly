# Roadmap

Budgetlyの実装フェーズです。

## Completed

### Phase 0: Planning

- サービス概要
- MVP範囲
- 技術スタック
- データ構造方針

### Phase 1: Project Setup

- Laravel backend
- React frontend
- Docker Compose
- MySQL
- API health check

### Phase 2: Core APIs

- Auth API
- User default categories
- Monthly budget API
- Expense CRUD API
- Subscription CRUD API

### Phase 3: Dashboard API

- Monthly budget summary
- Expense total
- Subscription total
- Remaining budget
- Usage rate

### Phase 4: Report API

- Category report
- Monthly report
- Recharts連携用データ

### Phase 5: Frontend API Integration

- Login/register flow
- Protected routes
- Dashboard
- Budgets
- Subscriptions
- Reports

### Phase 6: Frontend UX Polish

- Amount input UX
- Dashboard calendar
- Quick expense panel
- Empty states
- Basic responsive layout
- Japanese UI copy adjustment

### Phase 7: Documentation and QA

- README update
- API documentation
- Database documentation
- QA checklist
- Roadmap documentation
- Build/test verification

### Phase 8: Frontend QA and Minor UI Polish

- PC and mobile viewport checks
- Form validation message review
- Loading and error state review
- Chart readability review
- Manual browser QA
- Docker API URL alignment

### Phase 9: Docker Development Environment Polish

- Automatic Composer and npm dependency setup
- Automatic application key, migration, and seed setup
- MySQL and backend health checks
- Configurable local ports and database credentials
- Docker command and troubleshooting documentation
- Container-based build/test verification

### Phase 10: Architecture and Migration Design

- Next.js, TypeScript, and Tailwind migration boundaries
- Laravel and FastAPI service responsibilities
- MySQL retention decision
- Redis queue responsibility
- Receipt OCR workflow and security constraints

### Phase 11: Next.js Frontend Migration

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Existing route and navigation parity
- Typed Laravel API client
- Docker and browser QA

### Phase 12: FastAPI Foundation

- Internal AI service with service-token authentication
- Health, readiness, structured error, and request ID handling
- Receipt analysis and spending report Pydantic contracts
- Deterministic fake providers for local development and tests
- Docker and Laravel environment integration
- Pytest and Ruff verification

## Next Phases

### Phase 13: Receipt Domain and Laravel Integration

- Receipt upload and status APIs
- User-scoped authorization
- Analysis review and confirmation
- Expense creation transaction

### Phase 14: Redis Queue

- Asynchronous OCR processing
- Retry and failure handling
- Idempotent jobs

### Phase 15: OCR and AI Analysis

- Japanese receipt OCR
- Merchant, date, and total extraction
- Category suggestion
- Confidence reporting
- Japanese monthly spending summaries and recommendations

### Phase 16: Integrated Docker and QA

- Next.js, Laravel, FastAPI, MySQL, and Redis integration
- End-to-end receipt workflow
- Failure and recovery QA

### Phase 17: GitHub Actions

- Backend, frontend, and AI service checks
- Docker build verification
- Deployment gate

### Phase 18: AWS Deployment

- RDS MySQL
- ElastiCache Redis
- S3 receipt storage
- HTTPS, secrets, logs, and backups

## Current Scope

Implemented:

- Auth
- User-specific categories
- Monthly budgets
- Expenses
- Subscriptions
- Dashboard summary
- Reports
- Next.js frontend API integration
- Basic UX polish
- Documentation
- Target architecture and migration plan
- FastAPI service foundation
- Receipt and spending report AI contracts

Not implemented yet:

- Password reset
- Email verification
- Category update/delete
- Receipt OCR
- Real AI spending reports
- Redis queue
- AWS deployment
- Production CI/CD
- iOS app
