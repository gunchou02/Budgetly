ALTER TABLE "categories"
    ADD CONSTRAINT "categories_sort_order_nonnegative" CHECK ("sort_order" >= 0);

ALTER TABLE "monthly_budgets"
    ADD CONSTRAINT "monthly_budgets_year_range" CHECK ("year" BETWEEN 2000 AND 2100),
    ADD CONSTRAINT "monthly_budgets_month_range" CHECK ("month" BETWEEN 1 AND 12),
    ADD CONSTRAINT "monthly_budgets_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_amount_positive" CHECK ("amount" > 0),
    ADD CONSTRAINT "subscriptions_billing_day_range" CHECK ("billing_day" BETWEEN 1 AND 31),
    ADD CONSTRAINT "subscriptions_date_order" CHECK (
        "canceled_at" IS NULL OR "canceled_at" >= "started_at"
    );

ALTER TABLE "receipts"
    ADD CONSTRAINT "receipts_file_size_positive" CHECK ("file_size" > 0);

ALTER TABLE "receipt_analyses"
    ADD CONSTRAINT "receipt_analyses_amount_positive" CHECK (
        "amount" IS NULL OR "amount" > 0
    );

ALTER TABLE "rate_limit_buckets"
    ADD CONSTRAINT "rate_limit_buckets_count_nonnegative" CHECK ("count" >= 0);
