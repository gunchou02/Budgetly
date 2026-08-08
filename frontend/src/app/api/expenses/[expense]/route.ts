import { requireUser } from '@/server/auth';
import { parseDate } from '@/server/dates';
import { getDb } from '@/server/db';
import { consumeGuestMutationRateLimit } from '@/server/guest';
import { apiHandler, dataResponse } from '@/server/http';
import {
  notFound,
  requireOwnedCategory,
} from '@/server/ownership';
import { serializeExpense } from '@/server/serializers';
import { expenseSchema, jsonBody, routeId } from '@/server/validation';

interface RouteContext {
  params: Promise<{ expense: string }>;
}

export const GET = apiHandler(
  async (_request: Request, context: RouteContext) => {
    const user = await requireUser();
    const id = routeId((await context.params).expense);
    const expense = await getDb().expense.findFirst({
      where: { id, userId: user.id },
      include: { category: true },
    });

    if (!expense) {
      notFound();
    }

    return dataResponse(serializeExpense(expense));
  },
);

export const PUT = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser();
    await consumeGuestMutationRateLimit(user, request);
    const id = routeId((await context.params).expense);
    const input = expenseSchema.parse(await jsonBody(request));
    const db = getDb();
    const existing = await db.expense.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      notFound();
    }

    await requireOwnedCategory(user.id, input.category_id);

    const expense = await db.expense.update({
      where: { id },
      data: {
        categoryId: input.category_id,
        title: input.title,
        amount: input.amount,
        spentAt: parseDate(input.spent_at),
        memo: input.memo,
      },
      include: { category: true },
    });

    return dataResponse(serializeExpense(expense));
  },
);

export const DELETE = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser();
    await consumeGuestMutationRateLimit(user, request);
    const id = routeId((await context.params).expense);
    const result = await getDb().expense.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      notFound();
    }

    return new Response(null, { status: 204 });
  },
);
