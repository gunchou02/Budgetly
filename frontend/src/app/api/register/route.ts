import { hash } from 'bcryptjs';
import {
  createSessionRecord,
  publicUser,
  setSessionCookie,
} from '@/server/auth';
import { getDb } from '@/server/db';
import { ensureDefaultCategories } from '@/server/default-categories';
import { apiHandler, dataResponse } from '@/server/http';
import { jsonBody, registerSchema } from '@/server/validation';

export const POST = apiHandler(async (request: Request) => {
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
