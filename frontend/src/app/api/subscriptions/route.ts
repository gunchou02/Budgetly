import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { parseDate } from '@/server/dates';
import { getDb } from '@/server/db';
import { apiHandler, dataResponse } from '@/server/http';
import { requireOwnedCategory } from '@/server/ownership';
import { serializeSubscription } from '@/server/serializers';
import {
  jsonBody,
  searchParams,
  subscriptionSchema,
} from '@/server/validation';

const subscriptionFilterSchema = z.object({
  status: z.enum(['active', 'canceled', 'all']).optional().default('all'),
  category_id: z.coerce.number().int().positive().optional(),
});

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = subscriptionFilterSchema.parse(searchParams(request));
  const subscriptions = await getDb().subscription.findMany({
    where: {
      userId: user.id,
      ...(filter.category_id ? { categoryId: filter.category_id } : {}),
      ...(filter.status === 'active'
        ? { canceledAt: null }
        : filter.status === 'canceled'
          ? { canceledAt: { not: null } }
          : {}),
    },
    include: { category: true },
    orderBy: [{ billingDay: 'asc' }, { id: 'asc' }],
  });

  return dataResponse(subscriptions.map(serializeSubscription));
});

export const POST = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const input = subscriptionSchema.parse(await jsonBody(request));

  await requireOwnedCategory(user.id, input.category_id);

  const subscription = await getDb().subscription.create({
    data: {
      userId: user.id,
      categoryId: input.category_id,
      name: input.name,
      amount: input.amount,
      billingCycle: input.billing_cycle,
      billingDay: input.billing_day,
      startedAt: parseDate(input.started_at),
      canceledAt: input.canceled_at ? parseDate(input.canceled_at) : null,
      memo: input.memo,
    },
    include: { category: true },
  });

  return dataResponse(serializeSubscription(subscription), 201);
});
