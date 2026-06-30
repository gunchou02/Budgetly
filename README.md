# Budgetly

Budgetlyは、20〜30代向けの月間生活費・支出・サブスク管理サービスです。

毎月の生活費予算を設定し、通常支出とサブスク費用をまとめて管理できます。予算に対して今月いくら使ったのか、あといくら使えるのか、または何円オーバーしているのかを見える化します。

## Concept

- 月間生活費予算を管理する
- 通常支出とサブスク費用を分けて管理する
- 予算オーバー金額をすぐ確認できる
- 20〜30代の生活パターンに合わせたカテゴリを用意する

## Main Features

- ユーザー登録・ログイン
- 月間生活費予算の設定
- 支出の登録・編集・削除
- サブスクの登録・編集・解約
- カテゴリ別支出分析
- 今月の残り金額・予算使用率の表示
- 1日あたり使える金額の表示

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Recharts

### Backend

- Laravel
- Laravel Sanctum
- MySQL
- Form Request Validation
- API Resource
- Service Layer
- PHPUnit

Current backend version:

- Laravel 12
- PHP 8.3+

### Infrastructure

- Docker Compose
- MySQL
- Nginx

## Directory Structure

```txt
Budgetly/
├── backend/
├── frontend/
├── docker/
├── docker-compose.yml
└── README.md
```

## Initial MVP

```txt
1. ユーザー認証
2. 初期カテゴリ作成
3. 月間予算 CRUD
4. 支出 CRUD
5. サブスク CRUD
6. ダッシュボード集計 API
7. React ダッシュボード
```

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

## Default Categories

- 食費
- カフェ・スイーツ
- 交通費
- 家賃・住居
- 通信費
- サブスク
- ショッピング
- 美容
- 健康・運動
- 趣味・娯楽
- 交際費
- 学習・自己投資
- 旅行
- 日用品
- 医療費
- その他

## Local Development

```bash
docker compose up -d
```

Backend:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Verified Today

```bash
cd backend
composer install
php artisan key:generate
DB_CONNECTION=sqlite DB_DATABASE=/absolute/path/to/backend/database/database.sqlite php artisan migrate:fresh --seed
php artisan route:list
php artisan serve --host=127.0.0.1 --port=8081
```

```bash
curl http://127.0.0.1:8081/api/health
```

Response:

```json
{
  "status": "ok",
  "service": "Budgetly API",
  "locale": "ja",
  "timezone": "Asia/Tokyo"
}
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

Docker note:

```txt
Docker Desktop must be running before using docker compose.
```

## Notes

- 金額はJPY前提でintegerとして保存します。
- タイムゾーンはAsia/Tokyoを使用します。
- API内部のstatus値は英語、UI表示は日本語にします。
