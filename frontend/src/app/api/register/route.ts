import { hash } from 'bcryptjs';
import {
  createSessionRecord,
  publicUser,
  setSessionCookie,
} from '@/server/auth';
import { getDb } from '@/server/db';
import { ensureDefaultCategories } from '@/server/default-categories';
import { apiHandler, dataResponse } from '@/server/http';
import {
  anonymousRateLimitKey,
  consumeRateLimit,
} from '@/server/rate-limit';
import { jsonBody, registerSchema } from '@/server/validation';

const REGISTRATION_LIMIT = 5;
const REGISTRATION_WINDOW_SECONDS = 60 * 60;

export const POST = apiHandler(async (request: Request) => {
  await consumeRateLimit({
    key: anonymousRateLimitKey('registration', request),
    limit: REGISTRATION_LIMIT,
    windowSeconds: REGISTRATION_WINDOW_SECONDS,
  });
  await consumeRateLimit({
    key: anonymousRateLimitKey('registration-daily', request),
    limit: 20,
    windowSeconds: 60 * 60 * 24,
  });

  const input = registerSchema.parse(await jsonBody(request));
  const passwordHash = await hash(input.password, 12);

  const result = await getDb().$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });

    await ensureDefaultCategories(user.id, transaction);
    const session = await createSessionRecord(user.id, transaction);

    return { session, user };
  });

  await setSessionCookie(result.session);

  return dataResponse({ user: publicUser(result.user) }, 201);
});
