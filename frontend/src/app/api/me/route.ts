import { publicUser, requireUser } from '@/server/auth';
import { apiHandler, dataResponse } from '@/server/http';

export const GET = apiHandler(async () => {
  const user = await requireUser();

  return dataResponse(publicUser(user));
});
