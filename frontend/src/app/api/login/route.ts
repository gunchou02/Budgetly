import { compare } from 'bcryptjs';
import { createSession, publicUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { ApiError, apiHandler, dataResponse } from '@/server/http';
import { jsonBody, loginSchema } from '@/server/validation';

const INVALID_PASSWORD_HASH =
  '$2b$12$yYNL8WW3T2S.x3Iu.uY8Be7jlJTGCdjUfF6K5iQQC.pgzx6t0KEwK';

export const POST = apiHandler(async (request: Request) => {
  const input = loginSchema.parse(await jsonBody(request));
  const user = await getDb().user.findUnique({
    where: { email: input.email },
  });
  const passwordMatches = await compare(
    input.password,
    user?.passwordHash ?? INVALID_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    throw new ApiError(422, '入力内容を確認してください。', {
      email: ['メールアドレスまたはパスワードが正しくありません。'],
    });
  }

  await createSession(user.id);

  return dataResponse({ user: publicUser(user) });
});
