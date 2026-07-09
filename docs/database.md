# Database Documentation

Budgetlyはユーザー別の家計データを扱うため、主要テーブルは`user_id`でログインユーザーに紐づきます。

## users

認証ユーザーを管理します。

Main columns:

```txt
id
name
email
email_verified_at
password
remember_token
created_at
updated_at
```

Constraints:

- `email` is unique.

## categories

支出・固定費カテゴリを管理します。

Main columns:

```txt
id
user_id
name
color
icon
type
sort_order
is_default
created_at
updated_at
```

Notes:

- `user_id`はnullableですが、アプリ利用時は登録ユーザーごとにカテゴリを作成します。
- `type`は`expense`または`fixed`です。
- `sort_order`で表示順を制御します。
- 新規登録時に`config/budgetly.php`の初期カテゴリをユーザー別にコピーします。

Indexes:

```txt
user_id, sort_order
```

## monthly_budgets

月間予算を管理します。

Main columns:

```txt
id
user_id
year
month
amount
created_at
updated_at
```

Constraints:

```txt
unique(user_id, year, month)
```

Notes:

- 同じユーザーが同じ年月の予算を重複登録できない設計です。
- `amount`はJPYのintegerです。

## expenses

通常支出を管理します。

Main columns:

```txt
id
user_id
category_id
title
amount
spent_at
memo
created_at
updated_at
```

Relations:

- `user_id` references `users.id`.
- `category_id` references `categories.id`.

Indexes:

```txt
user_id, spent_at
user_id, category_id
```

Notes:

- `amount`はJPYのintegerです。
- APIではログインユーザー本人のカテゴリだけ指定できます。

## subscriptions

月額サブスクを管理します。

Main columns:

```txt
id
user_id
category_id
name
amount
billing_cycle
billing_day
started_at
canceled_at
memo
created_at
updated_at
```

Relations:

- `user_id` references `users.id`.
- `category_id` references `categories.id`.

Indexes:

```txt
user_id, canceled_at
user_id, billing_day
```

Notes:

- `billing_cycle`は現在`monthly`のみ対応です。
- `canceled_at`がnullなら有効なサブスクとして扱います。

## personal_access_tokens

Laravel SanctumのPersonal Access Tokenを保存します。

Main role:

```txt
API token authentication
```

## Data Isolation

実務上重要なポイントは、他ユーザーのデータを読めない・更新できないことです。

Budgetlyでは、次のAPIでログインユーザー条件を必ず含めます。

```txt
categories.user_id
monthly_budgets.user_id
expenses.user_id
subscriptions.user_id
```

例えば予算更新では、URLの`budget` IDだけでは更新せず、ログインユーザーの`monthlyBudgets()`リレーションから検索します。

```txt
request user -> monthlyBudgets -> whereKey(budget id)
```

これにより、別ユーザーのIDを直接指定しても404になります。
