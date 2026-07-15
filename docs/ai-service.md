# AI Service

BudgetlyのFastAPIサービスは、Laravelからだけ呼び出す内部分析サービスです。エンドユーザー認証、MySQLアクセス、支出の確定はLaravelが担当します。

Phase 12では外部OCR・LLMをまだ利用せず、固定結果を返すfake providerで通信契約とエラー処理を検証します。

## Responsibilities

- レシート画像参照から加盟店、日付、金額、カテゴリ候補を抽出する契約
- Laravelが計算した月次集計から日本語の要約、注目点、改善案を作る契約
- provider固有処理をadapterの後ろに分離
- request IDをレスポンスに返して障害調査を支援

FastAPIは予算残高やカテゴリ合計を計算しません。金額計算と保存の正本はLaravelです。

## Endpoints

```txt
GET  /health
GET  /ready
POST /v1/receipts/analyze
POST /v1/reports/analyze
```

`/health`と`/ready`以外は以下のヘッダーが必要です。

```http
X-Internal-Token: local-ai-secret
```

ルート`.env`と`ai-service/.env`の開発用トークンは、ステージング・本番環境で必ずsecret managerの値に置き換えます。

## Receipt Contract

```bash
curl -X POST http://127.0.0.1:8000/v1/receipts/analyze \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Token: local-ai-secret' \
  -d '{
    "job_id": "8e8782da-f3e9-4d32-a46e-45761843a849",
    "image_key": "receipts/user-1/sample.jpg",
    "mime_type": "image/jpeg",
    "language": "ja",
    "category_candidates": [
      {"id": 1, "name": "住居費"},
      {"id": 2, "name": "食費"}
    ]
  }'
```

`image_key`はPhase 13以降にLaravelが所有権を確認して発行します。FastAPIがユーザー指定の任意パスを直接読む設計にはしません。

## Spending Report Contract

Laravelが予算、支出合計、前月比、カテゴリ比率、サブスク比率を計算してからFastAPIへ渡します。

```bash
curl -X POST http://127.0.0.1:8000/v1/reports/analyze \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Token: local-ai-secret' \
  -d '{
    "period": "2026-07",
    "currency": "JPY",
    "budget_amount": 200000,
    "total_spent": 126000,
    "remaining_amount": 74000,
    "usage_rate": 63.0,
    "previous_month_total": 114000,
    "month_over_month_rate": 10.5,
    "subscription_total": 12000,
    "subscription_rate": 9.5,
    "categories": [
      {"name": "食費", "amount": 52000, "percentage": 41.3, "month_over_month_rate": 12.0}
    ]
  }'
```

fake providerも「最も支出が多いカテゴリ」「予算消化率」「前月比」「サブスク比率」を日本語で返すため、実AI導入前にLaravel・Next.js連携を安定させられます。

## Local Verification

```bash
cd ai-service
cp .env.example .env
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/ruff check .
.venv/bin/pytest
```

Dockerでは以下を使用します。

```bash
docker compose up -d --build ai-service
docker compose exec ai-service ruff check .
docker compose exec ai-service pytest
```

## Provider Replacement

Phase 15で`fake` adapterを実OCR・LLM providerに置き換えます。Pydantic契約、内部認証、Laravelのユーザー確認フローは維持するため、provider変更が既存CRUDへ波及しない構造です。
