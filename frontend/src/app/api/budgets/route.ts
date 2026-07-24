import { requireUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { apiHandler, dataResponse } from '@/server/http';
import { serializeBudget } from '@/server/serializers';
import {
  budgetSchema,
  jsonBody,
  searchParams,
  yearMonthSchema,
} from '@/server/validation';

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = yearMonthSchema.parse(searchParams(request));
  const budget = await getDb().monthlyBudget.findUnique({
    where: {
      userId_year_month: {
        userId: user.id,
        year: filter.year,
        month: filter.month,
      },
    },
  });

  return dataResponse(budget ? serializeBudget(budget) : null);
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const input = budgetSchema.parse(await jsonBody(request));
  const budget = await getDb().monthlyBudget.create({
    data: {
      userId: user.id,
      year: input.year,
      month: input.month,
      amount: input.amount,
    },
  });

  return dataResponse(serializeBudget(budget), 201);
});
