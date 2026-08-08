import { Prisma, type User } from '@/generated/prisma/client';
import { getDb } from '@/server/db';
import { ApiError } from '@/server/http';
import { consumeUserAndAddressRateLimits } from '@/server/rate-limit';

const EXPIRED_GUEST_CLEANUP_BATCH_SIZE = 10;

export type GuestResource =
  | 'budget'
  | 'category'
  | 'expense'
  | 'subscription';

const GUEST_RESOURCE_LIMITS: Record<GuestResource, number> = {
  budget: 120,
  category: 50,
  expense: 500,
  subscription: 100,
};

const GUEST_RESOURCE_LABELS: Record<GuestResource, string> = {
  budget: '予算',
  category: 'カテゴリ',
  expense: '支出',
  subscription: 'サブスクリプション',
};

export async function consumeGuestMutationRateLimit(
  user: User,
  request: Request,
): Promise<void> {
  if (!user.isGuest) {
    return;
  }

  await consumeUserAndAddressRateLimits({
    addressLimit: 300,
    request,
    scope: 'guest-mutation',
    userId: user.id,
    userLimit: 120,
    windowSeconds: 60,
  });
}

export async function enforceGuestResourceLimit(
  user: User,
  resource: GuestResource,
  transaction: Prisma.TransactionClient,
): Promise<void> {
  if (!user.isGuest) {
    return;
  }

  await transaction.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT "id"
    FROM "users"
    WHERE "id" = ${user.id}
    FOR UPDATE
  `);

  const where = { userId: user.id };
  let count: number;

  switch (resource) {
    case 'budget':
      count = await transaction.monthlyBudget.count({ where });
      break;
    case 'category':
      count = await transaction.category.count({ where });
      break;
    case 'expense':
      count = await transaction.expense.count({ where });
      break;
    case 'subscription':
      count = await transaction.subscription.count({ where });
      break;
  }

  const limit = GUEST_RESOURCE_LIMITS[resource];

  if (count >= limit) {
    throw new ApiError(
      403,
      `ゲスト利用で保存できる${GUEST_RESOURCE_LABELS[resource]}は${limit}件までです。続けて利用する場合はアカウントを作成してください。`,
      undefined,
      'guest_resource_limit_reached',
    );
  }
}

export async function deleteGuestAccount(userId: number): Promise<boolean> {
  const result = await getDb().user.deleteMany({
    where: { id: userId, isGuest: true },
  });

  return result.count > 0;
}

export async function cleanupExpiredGuestAccounts(
  batchSize = EXPIRED_GUEST_CLEANUP_BATCH_SIZE,
): Promise<number> {
  const boundedBatchSize = Math.max(1, Math.min(batchSize, 1_000));
  const deleted = await getDb().$queryRaw<Array<{ id: number }>>(Prisma.sql`
    DELETE FROM "users"
    WHERE "id" IN (
      SELECT "id"
      FROM "users"
      WHERE "is_guest" = TRUE
        AND "guest_expires_at" <= ${new Date()}
      ORDER BY "guest_expires_at" ASC
      LIMIT ${boundedBatchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"
  `);

  return deleted.length;
}
