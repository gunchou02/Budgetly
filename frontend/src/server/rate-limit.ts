import { createHmac } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { requiredEnv } from '@/server/config';
import { getDb } from '@/server/db';
import { ApiError } from '@/server/http';

interface RateLimitResult {
  count: number;
  reset_at: Date;
}

export function anonymousRateLimitKey(scope: string, request: Request): string {
  const vercelAddress = request.headers
    .get('x-vercel-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const forwardedAddress = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const address =
    vercelAddress ||
    request.headers.get('x-real-ip')?.trim() ||
    forwardedAddress ||
    'unknown';
  const digest = createHmac(
    'sha256',
    requiredEnv('RATE_LIMIT_KEY_SECRET'),
  )
    .update(address.toLowerCase())
    .digest('hex');

  return `${scope}:${digest}`;
}

export async function cleanupExpiredRateLimitBuckets(
  batchSize = 1_000,
): Promise<number> {
  const boundedBatchSize = Math.max(1, Math.min(batchSize, 5_000));
  const deleted = await getDb().$queryRaw<Array<{ key: string }>>(Prisma.sql`
    DELETE FROM "rate_limit_buckets"
    WHERE "key" IN (
      SELECT "key"
      FROM "rate_limit_buckets"
      WHERE "reset_at" <= ${new Date()}
      ORDER BY "reset_at" ASC
      LIMIT ${boundedBatchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "key"
  `);

  return deleted.length;
}

export async function consumeRateLimit(options: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowSeconds * 1000);
  const rows = await getDb().$queryRaw<RateLimitResult[]>(Prisma.sql`
    INSERT INTO "rate_limit_buckets" (
      "key",
      "count",
      "reset_at",
      "updated_at"
    )
    VALUES (
      ${options.key},
      1,
      ${resetAt},
      ${now}
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_buckets"."reset_at" <= ${now} THEN 1
        ELSE "rate_limit_buckets"."count" + 1
      END,
      "reset_at" = CASE
        WHEN "rate_limit_buckets"."reset_at" <= ${now} THEN ${resetAt}
        ELSE "rate_limit_buckets"."reset_at"
      END,
      "updated_at" = ${now}
    RETURNING "count", "reset_at"
  `);
  const result = rows[0];

  if (result && result.count > options.limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((result.reset_at.getTime() - now.getTime()) / 1000),
    );

    throw new ApiError(
      429,
      `リクエストが多すぎます。${retryAfter}秒後に再試行してください。`,
      undefined,
      'rate_limit_exceeded',
      { 'Retry-After': retryAfter.toString() },
    );
  }
}

export async function consumeUserAndAddressRateLimits(options: {
  addressLimit: number;
  request: Request;
  scope: string;
  userId: number;
  userLimit: number;
  windowSeconds: number;
}): Promise<void> {
  await consumeRateLimit({
    key: `${options.scope}:${options.userId}`,
    limit: options.userLimit,
    windowSeconds: options.windowSeconds,
  });
  await consumeRateLimit({
    key: anonymousRateLimitKey(`${options.scope}-address`, options.request),
    limit: options.addressLimit,
    windowSeconds: options.windowSeconds,
  });
}
