# API Documentation

Budgetly APIはLaravel SanctumのPersonal Access Token方式で認証します。

## Base URL

```txt
http://127.0.0.1:8080/api
```

When running the Laravel server directly with `php artisan serve --port=8081`, use `http://127.0.0.1:8081/api` instead.

認証が必要なAPIでは、次のヘッダーを付けます。

```txt
Authorization: Bearer {token}
Accept: application/json
```

## Common Error Responses

Validation error:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

Unauthenticated:

```json
{
  "message": "Unauthenticated."
}
```

Not found or another user's data:

```json
{
  "message": "No query results for model."
}
```

## Health

### GET /health

認証不要。APIの稼働確認に使用します。

```bash
curl http://127.0.0.1:8080/api/health
```

## Auth

### POST /register

ユーザーを作成し、初期カテゴリをユーザー別に作成します。

Request:

```json
{
  "name": "Taro",
  "email": "taro@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "Taro",
      "email": "taro@example.com"
    },
    "token": "plain-text-token"
  }
}
```

### POST /login

ログインしてAPIトークンを発行します。

Request:

```json
{
  "email": "taro@example.com",
  "password": "password123"
}
```

### POST /logout

認証必須。現在のAPIトークンを削除します。

### GET /me

認証必須。ログイン中のユーザー情報を返します。

## Categories

### GET /categories

認証必須。ログインユーザーのカテゴリを`sort_order`順で返します。

Query:

```txt
type=expense|fixed
```

### POST /categories

認証必須。ログインユーザー用のカテゴリを作成します。

Request:

```json
{
  "name": "書籍",
  "type": "expense"
}
```

Notes:

- `type`は`expense`または`fixed`です。
- 同じユーザー内でカテゴリ名は重複できません。

## Monthly Budgets

### GET /budgets

認証必須。指定月の予算を返します。

Query:

```txt
year=2026&month=7
```

### POST /budgets

認証必須。月間予算を作成します。

Request:

```json
{
  "year": 2026,
  "month": 7,
  "amount": 40000
}
```

Notes:

- 金額はJPY integerです。
- 同じユーザーの同じ`year + month`は重複できません。

### PUT /budgets/{budget}

認証必須。ログインユーザー本人の月間予算だけ更新できます。

## Expenses

### GET /expenses

認証必須。ログインユーザーの支出一覧を返します。

Query:

```txt
year=2026&month=7&category_id=1
```

### POST /expenses

認証必須。支出を作成します。

Request:

```json
{
  "category_id": 1,
  "title": "ランチ",
  "amount": 1200,
  "spent_at": "2026-07-09",
  "memo": "駅前"
}
```

### GET /expenses/{expense}

認証必須。ログインユーザー本人の支出だけ取得できます。

### PUT /expenses/{expense}

認証必須。ログインユーザー本人の支出だけ更新できます。

### DELETE /expenses/{expense}

認証必須。ログインユーザー本人の支出だけ削除できます。

## Subscriptions

### GET /subscriptions

認証必須。ログインユーザーのサブスク一覧を返します。

Query:

```txt
status=active|canceled|all&category_id=1
```

### POST /subscriptions

認証必須。サブスクを作成します。

Request:

```json
{
  "category_id": 1,
  "name": "Music",
  "amount": 980,
  "billing_cycle": "monthly",
  "billing_day": 25,
  "started_at": "2026-07-01",
  "memo": "personal plan"
}
```

Notes:

- `billing_cycle`は現在`monthly`のみ対応です。
- `billing_day`は1から31です。

### GET /subscriptions/{subscription}

認証必須。ログインユーザー本人のサブスクだけ取得できます。

### PUT /subscriptions/{subscription}

認証必須。ログインユーザー本人のサブスクだけ更新できます。

### PATCH /subscriptions/{subscription}/cancel

認証必須。サブスクを解約状態にします。

Request:

```json
{
  "canceled_at": "2026-07-09"
}
```

`canceled_at`を省略した場合は当日の日付が入ります。

### DELETE /subscriptions/{subscription}

認証必須。ログインユーザー本人のサブスクだけ削除できます。

## Dashboard

### GET /dashboard

認証必須。指定月の予算、支出、サブスク、残額、使用率などを返します。

Query:

```txt
year=2026&month=7
```

## Reports

### GET /reports/categories

認証必須。指定月のカテゴリ別支出レポートを返します。

Query:

```txt
year=2026&month=7
```

### GET /reports/monthly

認証必須。指定年の月別レポートを返します。

Query:

```txt
year=2026
```
