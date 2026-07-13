# Budgetly

Budgetlyは、20〜30代向けの月間生活費・支出・サブスク管理サービスです。

毎月の生活費予算を設定し、通常支出とサブスク費用をまとめて管理できます。予算に対して今月いくら使ったのか、あといくら使えるのか、または何円オーバーしているのかを見える化します。

## Main Features

- ユーザー登録・ログイン
- ユーザー別の初期カテゴリ作成
- 月間生活費予算の登録・編集
- 支出の登録・編集・削除
- サブスクの登録・編集・解約・削除
- ダッシュボードでの月次集計
- カテゴリ別・月別レポート
- ReactフロントエンドからのAPI連携

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Recharts
- lucide-react

### Backend

- Laravel 12
- PHP 8.3+
- Laravel Sanctum
- MySQL
- Form Request Validation
- Service Layer
- PHPUnit

### Infrastructure

- Docker Compose
- Nginx
- MySQL 8.4

## Directory Structure

```txt
Budgetly/
├── backend/              # Laravel API
├── frontend/             # React + Vite app
├── docker/               # Docker settings
├── docs/                 # API, DB, QA, roadmap docs
├── docker-compose.yml
└── README.md
```

## Local Development

### Docker

```bash
cp .env.example .env
docker compose up -d
```

Docker Desktop must be running before using Docker Compose.
On the first start, Composer and npm dependencies are installed automatically, then the application key, database migrations, and seed data are prepared.

Default URLs:

```txt
Frontend: http://127.0.0.1:5173
API:      http://127.0.0.1:8080/api
```

Check container status and initialization logs:

```bash
docker compose ps
docker compose logs -f backend
```

Run Laravel commands inside the backend container:

```bash
docker compose exec backend php artisan migrate:status
docker compose exec backend composer test
```

To change the host ports or local database credentials, edit the root `.env` file before starting the containers. See [Docker Development](docs/docker.md) for the full setup and troubleshooting guide.

### Backend without Docker

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8081
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend uses this API URL by default:

```txt
http://127.0.0.1:8080/api
```

When using `php artisan serve --port=8081` instead of Docker nginx, set this in `frontend/.env`:

```txt
VITE_API_BASE_URL=http://127.0.0.1:8081/api
```

Default frontend URL:

```txt
http://127.0.0.1:5173
```

## Verification

API health check:

```bash
curl http://127.0.0.1:8080/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "Budgetly API",
  "locale": "ja",
  "timezone": "Asia/Tokyo"
}
```

Backend tests:

```bash
cd backend
composer test
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Documents

- [API Documentation](docs/api.md)
- [Database Documentation](docs/database.md)
- [Docker Development](docs/docker.md)
- [Target Architecture](docs/architecture.md)
- [Stack Migration Plan](docs/migration-plan.md)
- [QA Checklist](docs/qa-checklist.md)
- [Roadmap](docs/roadmap.md)

## Budget Calculation

```txt
total_spent = expense_total + subscription_total
remaining = monthly_budget - total_spent
usage_rate = total_spent / monthly_budget * 100
```

Example:

```txt
月間予算: ¥40,000
通常支出: ¥38,000
サブスク: ¥12,000
合計支出: ¥50,000
残り: -¥10,000
状態: 予算オーバー
```

## Implementation Notes

- 金額はJPY前提でintegerとして保存します。
- タイムゾーンはAsia/Tokyoを使用します。
- API内部のstatus値は英語、UI表示は日本語にします。
- 認証はLaravel SanctumのPersonal Access Token方式です。
- 認証が必要なAPIは`auth:sanctum`で保護します。
- ユーザー別データは`user_id`条件で分離します。
