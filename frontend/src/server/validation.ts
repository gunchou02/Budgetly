import { z } from 'zod';
import { parseDate } from '@/server/dates';
import { ApiError } from '@/server/http';

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label}を入力してください。` })
    .trim()
    .min(1, `${label}を入力してください。`)
    .max(max, `${label}は${max}文字以内で入力してください。`);

const dateText = (label: string) =>
  z
    .string({ error: `${label}を入力してください。` })
    .refine(
      (value) => {
        try {
          parseDate(value);
          return true;
        } catch {
          return false;
        }
      },
      `${label}を正しい日付で入力してください。`,
    );

const emailSchema = z
  .string({ error: 'メールアドレスを入力してください。' })
  .trim()
  .toLowerCase()
  .pipe(
    z
      .email('有効なメールアドレスを入力してください。')
      .max(255, 'メールアドレスは255文字以内で入力してください。'),
  );

const bcryptPasswordLimit = (schema: z.ZodString) =>
  schema.refine(
    (value) => new TextEncoder().encode(value).byteLength <= 72,
    'パスワードは72バイト以内で入力してください。',
  );

export const yearSchema = z.coerce
  .number()
  .int('年は整数で入力してください。')
  .min(2000, '年は2000から2100の間で入力してください。')
  .max(2100, '年は2000から2100の間で入力してください。');

export const monthSchema = z.coerce
  .number()
  .int('月は整数で入力してください。')
  .min(1, '月は1から12の間で入力してください。')
  .max(12, '月は1から12の間で入力してください。');

export const registerSchema = z
  .object({
    name: requiredText('名前', 255),
    email: emailSchema,
    password: bcryptPasswordLimit(
      z
        .string({ error: 'パスワードを入力してください。' })
        .min(8, 'パスワードは8文字以上で入力してください。'),
    ),
    password_confirmation: z.string({
      error: '確認用パスワードを入力してください。',
    }),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ['password'],
    message: '確認用パスワードと一致しません。',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: bcryptPasswordLimit(
    z.string({ error: 'パスワードを入力してください。' }).min(1),
  ),
});

export const emptyJsonSchema = z.strictObject({});

export const yearMonthSchema = z.object({
  year: yearSchema,
  month: monthSchema,
});

export const budgetSchema = yearMonthSchema.extend({
  amount: z.coerce
    .number()
    .int('金額は整数で入力してください。')
    .min(0, '金額は0円以上で入力してください。'),
});

export const categoryCreateSchema = z.object({
  name: requiredText('カテゴリ名', 50),
  type: z.enum(['expense', 'fixed'], {
    error: 'カテゴリ種別を確認してください。',
  }),
});

export const expenseSchema = z.object({
  category_id: z.coerce.number().int().positive('カテゴリを選択してください。'),
  title: requiredText('タイトル', 100),
  amount: z.coerce
    .number()
    .int('金額は整数で入力してください。')
    .min(1, '金額は1円以上で入力してください。'),
  spent_at: dateText('日付'),
  memo: z
    .string()
    .trim()
    .max(1000, 'メモは1000文字以内で入力してください。')
    .optional()
    .nullable()
    .transform((value) => value || null),
});

export const subscriptionSchema = z
  .object({
    category_id: z.coerce.number().int().positive('カテゴリを選択してください。'),
    name: requiredText('サービス名', 100),
    amount: z.coerce
      .number()
      .int('金額は整数で入力してください。')
      .min(1, '金額は1円以上で入力してください。'),
    billing_cycle: z.literal('monthly').optional().default('monthly'),
    billing_day: z.coerce
      .number()
      .int()
      .min(1, '支払日は1から31の間で入力してください。')
      .max(31, '支払日は1から31の間で入力してください。'),
    started_at: dateText('開始日'),
    canceled_at: dateText('解約日').optional().nullable(),
    memo: z
      .string()
      .trim()
      .max(1000, 'メモは1000文字以内で入力してください。')
      .optional()
      .nullable()
      .transform((value) => value || null),
  })
  .refine(
    (data) =>
      !data.canceled_at ||
      parseDate(data.canceled_at) >= parseDate(data.started_at),
    {
      path: ['canceled_at'],
      message: '解約日は開始日以降の日付を入力してください。',
    },
  );

export const cancelSubscriptionSchema = z.object({
  canceled_at: dateText('解約日').optional().nullable(),
});

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'JSON形式のリクエストを送信してください。');
  }
}

export async function emptyJsonBody(request: Request): Promise<void> {
  const mediaType = request.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim()
    .toLowerCase();

  if (mediaType !== 'application/json') {
    throw new ApiError(415, 'JSON形式のリクエストを送信してください。');
  }

  emptyJsonSchema.parse(await jsonBody(request));
}

export function searchParams(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export function routeId(value: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(404, 'データが見つかりません。');
  }

  return id;
}
