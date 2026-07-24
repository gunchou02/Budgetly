import { createHash } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import type { SpendingInsightPayload } from '@/server/ai-client';
import { analyzeSpendingReport } from '@/server/ai-client';
import {
  compareYearMonth,
  daysInMonth,
  monthRange,
  todayInAppTimeZone,
} from '@/server/dates';
import { getDb } from '@/server/db';

export interface SubscriptionForReport {
  amount: number;
  billingDay: number;
  canceledAt: Date | null;
  startedAt: Date;
}

interface MonthlyReport {
  year: number;
  month: number;
  budget: number;
  expense_total: number;
  subscription_total: number;
  total_spent: number;
  remaining: number;
  usage_rate: number;
  status: 'safe' | 'warning' | 'over_budget';
  daily_available_amount: number;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveStatus(
  budget: number,
  totalSpent: number,
  usageRate: number,
): MonthlyReport['status'] {
  if (budget <= 0) {
    return totalSpent > 0 ? 'over_budget' : 'safe';
  }

  if (usageRate >= 100) {
    return 'over_budget';
  }

  return usageRate >= 70 ? 'warning' : 'safe';
}

export function subscriptionOccursInMonth(
  subscription: SubscriptionForReport,
  year: number,
  month: number,
): boolean {
  const monthEnd = new Date(Date.UTC(year, month, 0));

  if (subscription.startedAt > monthEnd) {
    return false;
  }

  const startYear = subscription.startedAt.getUTCFullYear();
  const startMonth = subscription.startedAt.getUTCMonth() + 1;
  const billingDay = Math.min(
    subscription.billingDay,
    daysInMonth(year, month),
  );
  const occurrenceDay =
    startYear === year &&
    startMonth === month &&
    subscription.startedAt.getUTCDate() > billingDay
      ? subscription.startedAt.getUTCDate()
      : billingDay;
  const occurrence = new Date(Date.UTC(year, month - 1, occurrenceDay));

  return !subscription.canceledAt || subscription.canceledAt >= occurrence;
}

function calculateSubscriptionTotal(
  subscriptions: SubscriptionForReport[],
  year: number,
  month: number,
): number {
  return subscriptions.reduce(
    (total, subscription) =>
      total +
      (subscriptionOccursInMonth(subscription, year, month)
        ? subscription.amount
        : 0),
    0,
  );
}

function dailyAvailableAmount(
  year: number,
  month: number,
  remaining: number,
  now = new Date(),
): number {
  const today = todayInAppTimeZone(now);
  const comparison = compareYearMonth({ year, month }, today);
  const remainingDays =
    comparison > 0
      ? daysInMonth(year, month)
      : comparison < 0
        ? 0
        : daysInMonth(year, month) - today.day + 1;

  return remainingDays > 0 ? Math.floor(remaining / remainingDays) : 0;
}

export function monthlyResult(input: {
  budget: number;
  expenseTotal: number;
  month: number;
  now?: Date;
  subscriptionTotal: number;
  year: number;
}): MonthlyReport {
  const totalSpent = input.expenseTotal + input.subscriptionTotal;
  const remaining = input.budget - totalSpent;
  const usageRate =
    input.budget > 0 ? roundOne((totalSpent / input.budget) * 100) : 0;

  return {
    year: input.year,
    month: input.month,
    budget: input.budget,
    expense_total: input.expenseTotal,
    subscription_total: input.subscriptionTotal,
    total_spent: totalSpent,
    remaining,
    usage_rate: usageRate,
    status: resolveStatus(input.budget, totalSpent, usageRate),
    daily_available_amount: dailyAvailableAmount(
      input.year,
      input.month,
      remaining,
      input.now,
    ),
  };
}

export async function buildMonthlyReport(
  userId: number,
  year: number,
  month: number,
  now?: Date,
): Promise<MonthlyReport> {
  const db = getDb();
  const range = monthRange(year, month);
  const [budget, expenses, subscriptions] = await Promise.all([
    db.monthlyBudget.findUnique({
      where: { userId_year_month: { userId, year, month } },
      select: { amount: true },
    }),
    db.expense.aggregate({
      where: {
        userId,
        spentAt: { gte: range.start, lt: range.endExclusive },
      },
      _sum: { amount: true },
    }),
    db.subscription.findMany({
      where: { userId, startedAt: { lt: range.endExclusive } },
      select: {
        amount: true,
        billingDay: true,
        startedAt: true,
        canceledAt: true,
      },
    }),
  ]);

  return monthlyResult({
    year,
    month,
    budget: budget?.amount ?? 0,
    expenseTotal: expenses._sum.amount ?? 0,
    subscriptionTotal: calculateSubscriptionTotal(subscriptions, year, month),
    now,
  });
}

export async function buildCategoryReport(
  userId: number,
  year: number,
  month: number,
) {
  const range = monthRange(year, month);
  const [categories, totals] = await Promise.all([
    getDb().category.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    getDb().expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        spentAt: { gte: range.start, lt: range.endExclusive },
      },
      _sum: { amount: true },
    }),
  ]);
  const totalsByCategory = new Map(
    totals.map((total) => [total.categoryId, total._sum.amount ?? 0]),
  );
  const expenseTotal = totals.reduce(
    (sum, total) => sum + (total._sum.amount ?? 0),
    0,
  );

  return {
    year,
    month,
    expense_total: expenseTotal,
    categories: categories.flatMap((category) => {
      const amount = totalsByCategory.get(category.id) ?? 0;

      if (amount <= 0) {
        return [];
      }

      return [
        {
          category_id: category.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
          amount,
          percentage:
            expenseTotal > 0 ? roundOne((amount / expenseTotal) * 100) : 0,
        },
      ];
    }),
  };
}

export async function buildAnnualReport(userId: number, year: number) {
  const db = getDb();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const [budgets, expenseRows, subscriptions] = await Promise.all([
    db.monthlyBudget.findMany({
      where: { userId, year },
      select: { month: true, amount: true },
    }),
    db.$queryRaw<Array<{ expense_total: bigint; month: number }>>(Prisma.sql`
      SELECT
        EXTRACT(MONTH FROM "spent_at")::integer AS "month",
        SUM("amount")::bigint AS "expense_total"
      FROM "expenses"
      WHERE "user_id" = ${userId}
        AND "spent_at" >= ${yearStart}
        AND "spent_at" < ${yearEnd}
      GROUP BY EXTRACT(MONTH FROM "spent_at")
    `),
    db.subscription.findMany({
      where: { userId, startedAt: { lt: yearEnd } },
      select: {
        amount: true,
        billingDay: true,
        startedAt: true,
        canceledAt: true,
      },
    }),
  ]);
  const budgetsByMonth = new Map(
    budgets.map((budget) => [budget.month, budget.amount]),
  );
  const expensesByMonth = new Map(
    expenseRows.map((row) => [row.month, Number(row.expense_total)]),
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const report = monthlyResult({
      year,
      month,
      budget: budgetsByMonth.get(month) ?? 0,
      expenseTotal: expensesByMonth.get(month) ?? 0,
      subscriptionTotal: calculateSubscriptionTotal(
        subscriptions,
        year,
        month,
      ),
    });

    return {
      year: report.year,
      month: report.month,
      budget: report.budget,
      expense_total: report.expense_total,
      subscription_total: report.subscription_total,
      total_spent: report.total_spent,
      remaining: report.remaining,
      usage_rate: report.usage_rate,
      status: report.status,
      subscription_rate:
        report.total_spent > 0
          ? roundOne(
              (report.subscription_total / report.total_spent) * 100,
            )
          : 0,
    };
  });
  const expenseTotal = months.reduce(
    (sum, month) => sum + month.expense_total,
    0,
  );
  const subscriptionTotal = months.reduce(
    (sum, month) => sum + month.subscription_total,
    0,
  );
  const totalSpent = expenseTotal + subscriptionTotal;

  return {
    year,
    summary: {
      expense_total: expenseTotal,
      subscription_total: subscriptionTotal,
      total_spent: totalSpent,
      subscription_rate:
        totalSpent > 0
          ? roundOne((subscriptionTotal / totalSpent) * 100)
          : 0,
    },
    months,
  };
}

function previousMonth(year: number, month: number) {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

function changeRate(current: number, previous: number): number | null {
  return previous > 0
    ? roundOne(((current - previous) / previous) * 100)
    : null;
}

export async function buildSpendingInsights(
  userId: number,
  year: number,
  month: number,
) {
  const previous = previousMonth(year, month);
  const [
    currentReport,
    previousReport,
    currentCategories,
    previousCategories,
  ] = await Promise.all([
    buildMonthlyReport(userId, year, month),
    buildMonthlyReport(userId, previous.year, previous.month),
    buildCategoryReport(userId, year, month),
    buildCategoryReport(userId, previous.year, previous.month),
  ]);
  const previousByCategory = new Map(
    previousCategories.categories.map((category) => [
      category.category_id,
      category.amount,
    ]),
  );
  const payload: SpendingInsightPayload = {
    period: `${year}-${String(month).padStart(2, '0')}`,
    currency: 'JPY',
    budget_amount: currentReport.budget,
    total_spent: currentReport.total_spent,
    remaining_amount: currentReport.remaining,
    usage_rate: currentReport.usage_rate,
    previous_month_total: previousReport.total_spent,
    month_over_month_rate: changeRate(
      currentReport.total_spent,
      previousReport.total_spent,
    ),
    subscription_total: currentReport.subscription_total,
    subscription_rate:
      currentReport.total_spent > 0
        ? roundOne(
            (currentReport.subscription_total / currentReport.total_spent) *
              100,
          )
        : 0,
    categories: currentCategories.categories
      .slice(0, 100)
      .map((category) => ({
        name: category.name,
        amount: category.amount,
        percentage: category.percentage,
        month_over_month_rate: changeRate(
          category.amount,
          previousByCategory.get(category.category_id) ?? 0,
        ),
      })),
  };
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  const db = getDb();
  const cached = await db.aiReportCache.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
  });

  if (cached && cached.expiresAt > new Date()) {
    return cached.payload;
  }

  const insight = await analyzeSpendingReport(payload);
  const configuredTtl = Number(process.env.AI_REPORT_CACHE_TTL_SECONDS ?? 3600);
  const ttlSeconds = Number.isFinite(configuredTtl)
    ? Math.max(60, configuredTtl)
    : 3600;

  await db.aiReportCache.upsert({
    where: { userId_fingerprint: { userId, fingerprint } },
    update: {
      payload: insight,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
    create: {
      userId,
      fingerprint,
      payload: insight,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
  });

  return insight;
}
