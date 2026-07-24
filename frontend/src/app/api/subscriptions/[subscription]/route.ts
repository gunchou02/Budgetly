import { requireUser } from '@/server/auth';
import { parseDate } from '@/server/dates';
import { getDb } from '@/server/db';
import { apiHandler, dataResponse } from '@/server/http';
import {
  notFound,
  requireOwnedCategory,
} from '@/server/ownership';
import { serializeSubscription } from '@/server/serializers';
import {
  jsonBody,
  routeId,
  subscriptionSchema,
} from '@/server/validation';

interface RouteContext {
  params: Promise<{ subscription: string }>;
}

export const GET = apiHandler(
  async (_request: Request, context: RouteContext) => {
    const user = await requireUser();
    const id = routeId((await context.params).subscription);
    const subscription = await getDb().subscription.findFirst({
      where: { id, userId: user.id },
      include: { category: true },
    });

    if (!subscription) {
      notFound();
    }

    return dataResponse(serializeSubscription(subscription));
  },
);

export const PUT = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser();
    const id = routeId((await context.params).subscription);
    const input = subscriptionSchema.parse(await jsonBody(request));
    const db = getDb();
    const existing = await db.subscription.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      notFound();
    }

    await requireOwnedCategory(user.id, input.category_id);

    const subscription = await db.subscription.update({
      where: { id },
      data: {
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

    return dataResponse(serializeSubscription(subscription));
  },
);

export const DELETE = apiHandler(
  async (_request: Request, context: RouteContext) => {
    const user = await requireUser();
    const id = routeId((await context.params).subscription);
    const result = await getDb().subscription.deleteMany({
      where: { id, userId: user.id },
    });

    if (result.count === 0) {
      notFound();
    }

    return new Response(null, { status: 204 });
  },
);
