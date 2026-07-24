import { describe, expect, it } from 'vitest';
import {
  budgetSchema,
  expenseSchema,
  registerSchema,
  subscriptionSchema,
} from '@/server/validation';

describe('API validation schemas', () => {
  it('normalizes registration email and checks confirmation', () => {
    expect(
      registerSchema.parse({
        name: 'Budgetly User',
        email: ' USER@Example.COM ',
        password: 'password123',
        password_confirmation: 'password123',
      }).email,
    ).toBe('user@example.com');

    expect(() =>
      registerSchema.parse({
        name: 'Budgetly User',
        email: 'user@example.com',
        password: 'password123',
        password_confirmation: 'different',
      }),
    ).toThrow();
  });

  it('rejects passwords beyond the bcrypt byte limit', () => {
    const result = registerSchema.safeParse({
      name: 'Budgetly User',
      email: 'user@example.com',
      password: 'a'.repeat(73),
      password_confirmation: 'a'.repeat(73),
    });

    expect(result.success).toBe(false);
  });

  it('enforces budget and expense amount rules', () => {
    expect(
      budgetSchema.parse({ year: '2026', month: '7', amount: '0' }),
    ).toEqual({ year: 2026, month: 7, amount: 0 });

    expect(() =>
      expenseSchema.parse({
        category_id: 1,
        title: 'Lunch',
        amount: 0,
        spent_at: '2026-07-24',
        memo: '',
      }),
    ).toThrow();
  });

  it('rejects a subscription canceled before it starts', () => {
    expect(() =>
      subscriptionSchema.parse({
        category_id: 1,
        name: 'Service',
        amount: 1000,
        billing_day: 10,
        started_at: '2026-07-20',
        canceled_at: '2026-07-19',
        memo: '',
      }),
    ).toThrow();
  });
});
