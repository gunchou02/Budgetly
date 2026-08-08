import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { monthRange, parseDate } from '@/server/dates';
import { getDb } from '@/server/db';
import {
  consumeGuestMutationRateLimit,
  enforceGuestResourceLimit,
} from '@/server/guest';
import { apiHandler, dataResponse } from '@/server/http';
import { requireOwnedCategory } from '@/server/ownership';
import { serializeExpense } from '@/server/serializers';
import {
  expenseSchema,
  jsonBody,
  monthSchema,
  searchParams,
  yearSchema,
} from '@/server/validation';

const expenseFilterSchema = z.object({
  year: yearSchema.optional(),
  month: monthSchema.optional(),
  category_id: z.coerce.number().int().positive().optional(),
});

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = expenseFilterSchema.parse(searchParams(request));
  const db = getDb();
  const where: Prisma.ExpenseWhereInput = {
    userId: user.id,
    ...(filter.category_id ? { categoryId: filter.category_id } : {}),
  };

  if (filter.year && filter.month) {
    const range = monthRange(filter.year, filter.month);
    where.spentAt = { gte: range.start, lt: range.endExclusive };
  } else if (filter.year) {
    where.spentAt = {
      gte: new Date(Date.UTC(filter.year, 0, 1)),
      lt: new Date(Date.UTC(filter.year + 1, 0, 1)),
    };
  } else if (filter.month) {
    const matchingIds = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT "id"
      FROM "expenses"
      WHERE "user_id" = ${user.id}
        AND EXTRACT(MONTH FROM "spent_at") = ${filter.month}
    `);
    where.id = { in: matchingIds.map((row) => row.id) };
  }

  const expenses = await db.expense.findMany({
    where,
    include: { category: true },
    orderBy: [{ spentAt: 'desc' }, { id: 'desc' }],
  });

  return dataResponse(expenses.map(serializeExpense));
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireUser();
  await consumeGuestMutationRateLimit(user, request);
  const input = expenseSchema.parse(await jsonBody(request));

  await requireOwnedCategory(user.id, input.category_id);

  const expense = await getDb().$transaction(async (transaction) => {
    await enforceGuestResourceLimit(user, 'expense', transaction);

    return transaction.expense.create({
      data: {
        userId: user.id,
        categoryId: input.category_id,
        title: input.title,
        amount: input.amount,
        spentAt: parseDate(input.spent_at),
        memo: input.memo,
      },
      include: { category: true },
    });
  });

  return dataResponse(serializeExpense(expense), 201);
});
