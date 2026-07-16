# AI Service

BudgetlyのFastAPIサービスは、Laravelからだけ呼び出す内部分析サービスです。エンドユーザー認証、MySQLアクセス、支出の確定はLaravelが担当します。

Phase 15では`fake` providerに加えてOpenAI Responses APIを利用する実providerを実装しています。ローカルの既定値は`fake`のままなので、API keyなしでも開発と自動テストを実行できます。

## Responsibilities

- レシート画像から加盟店、日付、金額、カテゴリ候補を抽出する契約
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
  -H 'X-Internal-Token: local-ai-secret' \
  -F 'payload={
    "job_id": "8e8782da-f3e9-4d32-a46e-45761843a849",
    "image_key": "receipts/user-1/sample.jpg",
    "mime_type": "image/jpeg",
    "language": "ja",
    "category_candidates": [
      {"id": 1, "name": "住居費"},
      {"id": 2, "name": "食費"}
    ]
  }' \
  -F 'image=@receipt.jpg;type=image/jpeg'
```

Laravel workerは所有権を確認済みの非公開ファイルをread streamでmultipart送信します。FastAPIは`image_key`から任意のパスを読みません。受信画像は5 MB、4,000万pixel、JPEG/PNG/WebPの実形式を再検証し、EXIF方向補正、白背景合成、最大2,048pxへの縮小、軽いコントラスト・鮮明化を適用してJPEGに正規化します。

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

Laravelの`GET /api/reports/insights?year=2026&month=7`がこの契約を呼び出します。入力値のfingerprintごとに結果をキャッシュするため、同じ集計で画面を再表示してもproviderを繰り返し呼びません。AIが停止しても既存のカテゴリ・月別レポートAPIは独立して動作します。

## OpenAI Provider

ルート`.env`でproviderとkeyを設定し、AI serviceを再作成します。

```dotenv
AI_RECEIPT_PROVIDER=openai
AI_REPORT_PROVIDER=openai
AI_OPENAI_MODEL=gpt-4o-mini
OPENAI_API_KEY=your-secret-key
```

```bash
docker compose up -d --build ai-service
docker compose restart worker
```

画像はbase64 data URLとしてResponses APIへ渡し、文字認識のため`detail: high`を使用します。抽出結果はPydantic structured outputで制限し、providerが返したcategory IDをFastAPIとLaravelの両方で再確認します。API keyとOCR全文はログに残さず、`store: false`でリクエストします。

- [OpenAI image input guide](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)

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

## OCR Quality Evaluation

実レシート画像には個人情報が含まれるためGitへ追加しません。匿名化したコンビニ、スーパー、飲食店レシートを`ai-service/evaluation/images/`へ置き、example manifestをコピーして期待値を入力します。

```bash
cd ai-service
cp evaluation/manifest.example.json evaluation/manifest.local.json
AI_INTERNAL_API_TOKEN=local-ai-secret \
  .venv/bin/python scripts/evaluate_receipts.py evaluation/manifest.local.json
```

評価コマンドはmerchant、date、amount、categoryの完全一致率だけを表示し、OCR全文は出力しません。provider/model変更時は同じ非公開fixtureでbaselineを再測定します。金額または日付のconfidenceが低い結果も必ず`review_required`となり、ユーザー確認なしに支出へ変換されません。
