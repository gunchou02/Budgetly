import { requireUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { apiHandler, dataResponse } from '@/server/http';
import { notFound } from '@/server/ownership';
import { serializeBudget } from '@/server/serializers';
import { budgetSchema, jsonBody, routeId } from '@/server/validation';

interface RouteContext {
  params: Promise<{ budget: string }>;
}

export const PUT = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser();
    const id = routeId((await context.params).budget);
    const input = budgetSchema.parse(await jsonBody(request));

    const existing = await getDb().monthlyBudget.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      notFound();
    }

    const budget = await getDb().monthlyBudget.update({
      where: { id },
      data: {
        year: input.year,
        month: input.month,
        amount: input.amount,
      },
    });

    return dataResponse(serializeBudget(budget));
  },
);
