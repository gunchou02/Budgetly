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

## Next Phases

### Phase 8: Frontend QA and Minor UI Polish

Purpose:

```txt
画面単位で実際の操作感を確認し、小さな崩れや分かりづらさを直す。
```

Candidate tasks:

- PC and mobile viewport checks
- Form validation message review
- Loading and error state review
- Chart readability review
- Manual browser QA

Out of scope:

- Navigation redesign
- Large UI redesign
- New domain features

### Phase 9: Docker Development Environment Polish

Purpose:

```txt
Dockerだけで開発環境を立ち上げやすくする。
```

Candidate tasks:

- Backend container dependency setup review
- `.env` setup documentation
- MySQL migration flow review
- Docker command documentation

### Phase 10: Deployment Preparation

Purpose:

```txt
AWSなどにデプロイできる状態へ近づける。
```

Candidate tasks:

- Production environment variables
- Laravel config cache notes
- Database migration strategy
- Static frontend build strategy
- CORS and API base URL review

### Phase 11: Portfolio Polish

Purpose:

```txt
採用担当者や面接官に説明しやすい状態にする。
```

Candidate tasks:

- Screenshots
- Demo scenario
- Architecture diagram
- Japanese project description
- Korean explanation for interview preparation

### Phase 12: Future Product Features

Purpose:

```txt
MVP後に追加する価値がある機能を実装する。
```

Candidate tasks:

- Category edit/delete
- Password reset
- Email verification
- CSV export
- Recurring expense improvements
- Notification/reminder
- iOS app planning

## Current Scope

Implemented:

- Auth
- User-specific categories
- Monthly budgets
- Expenses
- Subscriptions
- Dashboard summary
- Reports
- React frontend API integration
- Basic UX polish
- Documentation

Not implemented yet:

- Password reset
- Email verification
- Category update/delete
- AWS deployment
- Production CI/CD
- iOS app
