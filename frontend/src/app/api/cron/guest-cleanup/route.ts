import { cleanupExpiredGuestAccounts } from '@/server/guest';
import { ApiError, apiHandler, dataResponse } from '@/server/http';
import { cleanupExpiredRateLimitBuckets } from '@/server/rate-limit';

const GUEST_CLEANUP_BATCH_SIZE = 100;
const RATE_LIMIT_CLEANUP_BATCH_SIZE = 1_000;
const MAX_BATCHES_PER_RUN = 10;

export const maxDuration = 60;

export const GET = apiHandler(async (request: Request) => {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (
    !cronSecret ||
    request.headers.get('authorization') !== `Bearer ${cronSecret}`
  ) {
    throw new ApiError(401, 'Unauthorized.');
  }

  let deletedAccounts = 0;
  let deletedRateLimitBuckets = 0;

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const deletedInBatch = await cleanupExpiredGuestAccounts(
      GUEST_CLEANUP_BATCH_SIZE,
    );
    deletedAccounts += deletedInBatch;

    if (deletedInBatch < GUEST_CLEANUP_BATCH_SIZE) {
      break;
    }
  }

  for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
    const deletedInBatch = await cleanupExpiredRateLimitBuckets(
      RATE_LIMIT_CLEANUP_BATCH_SIZE,
    );
    deletedRateLimitBuckets += deletedInBatch;

    if (deletedInBatch < RATE_LIMIT_CLEANUP_BATCH_SIZE) {
      break;
    }
  }

  return dataResponse({
    deleted_accounts: deletedAccounts,
    deleted_rate_limit_buckets: deletedRateLimitBuckets,
  });
});
