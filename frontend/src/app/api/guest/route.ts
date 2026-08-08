import { randomBytes, randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { GUEST_SESSION_TTL_SECONDS } from '@/server/config';
import {
  createSessionRecord,
  currentUser,
  publicUser,
  setSessionCookie,
} from '@/server/auth';
import { getDb } from '@/server/db';
import { ensureDefaultCategories } from '@/server/default-categories';
import { cleanupExpiredGuestAccounts } from '@/server/guest';
import { ApiError, apiHandler, dataResponse } from '@/server/http';
import {
  anonymousRateLimitKey,
  consumeRateLimit,
} from '@/server/rate-limit';
import { emptyJsonBody } from '@/server/validation';

const GUEST_CREATION_LIMIT = 5;
const GUEST_CREATION_WINDOW_SECONDS = 60 * 60;

export const POST = apiHandler(async (request: Request) => {
  await emptyJsonBody(request);

  if (await currentUser()) {
    throw new ApiError(409, 'すでにログインしています。');
  }

  await consumeRateLimit({
    key: anonymousRateLimitKey('guest-session', request),
    limit: GUEST_CREATION_LIMIT,
    windowSeconds: GUEST_CREATION_WINDOW_SECONDS,
  });
  await consumeRateLimit({
    key: anonymousRateLimitKey('guest-session-daily', request),
    limit: 20,
    windowSeconds: 60 * 60 * 24,
  });

  const guestExpiresAt = new Date(
    Date.now() + GUEST_SESSION_TTL_SECONDS * 1000,
  );
  const result = await getDb().$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        name: 'ゲスト',
        email: `guest-${randomUUID()}@guest.budgetly.invalid`,
        passwordHash: `!guest-${randomBytes(32).toString('base64url')}`,
        isGuest: true,
        guestExpiresAt,
      },
    });

    await ensureDefaultCategories(user.id, transaction);
    const session = await createSessionRecord(
      user.id,
      transaction,
      guestExpiresAt,
    );

    return { session, user };
  });

  await setSessionCookie(result.session);
  after(async () => {
    await cleanupExpiredGuestAccounts();
  });

  return dataResponse({ user: publicUser(result.user) }, 201);
});
