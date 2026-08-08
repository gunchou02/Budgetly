import { requireUser } from '@/server/auth';
import {
  formatDate,
  parseDate,
  todayDateStringInAppTimeZone,
} from '@/server/dates';
import { getDb } from '@/server/db';
import { consumeGuestMutationRateLimit } from '@/server/guest';
import { ApiError, apiHandler, dataResponse } from '@/server/http';
import { notFound } from '@/server/ownership';
import { serializeSubscription } from '@/server/serializers';
import {
  cancelSubscriptionSchema,
  jsonBody,
  routeId,
} from '@/server/validation';

interface RouteContext {
  params: Promise<{ subscription: string }>;
}

export const PATCH = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser();
    await consumeGuestMutationRateLimit(user, request);
    const id = routeId((await context.params).subscription);
    const input = cancelSubscriptionSchema.parse(await jsonBody(request));
    const db = getDb();
    const existing = await db.subscription.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      notFound();
    }

    const canceledAt = parseDate(
      input.canceled_at ?? todayDateStringInAppTimeZone(),
    );

    if (canceledAt < existing.startedAt) {
      throw new ApiError(422, '入力内容を確認してください。', {
        canceled_at: [
          `解約日は開始日（${formatDate(existing.startedAt)}）以降を指定してください。`,
        ],
      });
    }

    const subscription = await db.subscription.update({
      where: { id },
      data: { canceledAt },
      include: { category: true },
    });

    return dataResponse(serializeSubscription(subscription));
  },
);
