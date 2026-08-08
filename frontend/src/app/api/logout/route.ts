import { deleteCurrentSession } from '@/server/auth';
import { apiHandler, messageResponse } from '@/server/http';
import { emptyJsonBody } from '@/server/validation';

export const POST = apiHandler(async (request: Request) => {
  await emptyJsonBody(request);
  await deleteCurrentSession();

  return messageResponse('Logged out successfully.');
});
