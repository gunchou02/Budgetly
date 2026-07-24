import { describe, expect, it } from 'vitest';
import { parseDate } from '@/server/dates';
import {
  monthlyResult,
  subscriptionOccursInMonth,
} from '@/server/reports';

describe('monthly budget calculations', () => {
  it('counts a subscription started after its billing day in the start month', () => {
    expect(
      subscriptionOccursInMonth(
        {
          amount: 1200,
          billingDay: 10,
          startedAt: parseDate('2026-07-20'),
          canceledAt: null,
        },
        2026,
        7,
      ),
    ).toBe(true);
  });

  it('clamps a billing day to the end of a short month', () => {
    expect(
      subscriptionOccursInMonth(
        {
          amount: 1200,
          billingDay: 31,
          startedAt: parseDate('2026-01-01'),
          canceledAt: parseDate('2026-02-27'),
        },
        2026,
        2,
      ),
    ).toBe(false);
  });

  it('resolves usage status and remaining daily amount', () => {
    expect(
      monthlyResult({
        year: 2026,
        month: 7,
        budget: 100_000,
        expenseTotal: 60_000,
        subscriptionTotal: 15_000,
        now: new Date('2026-07-23T15:00:00.000Z'),
      }),
    ).toMatchObject({
      total_spent: 75_000,
      remaining: 25_000,
      usage_rate: 75,
      status: 'warning',
      daily_available_amount: 3125,
    });
  });

  it('marks spending without a budget as over budget', () => {
    expect(
      monthlyResult({
        year: 2026,
        month: 7,
        budget: 0,
        expenseTotal: 1,
        subscriptionTotal: 0,
      }).status,
    ).toBe('over_budget');
  });
});
