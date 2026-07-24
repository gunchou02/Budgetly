import { Prisma } from '@/generated/prisma/client';
import { getDb } from '@/server/db';
import { ApiError } from '@/server/http';

interface RateLimitResult {
  count: number;
  reset_at: Date;
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
    );
  }
}
