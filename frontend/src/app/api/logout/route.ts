import { deleteCurrentSession } from '@/server/auth';
import { apiHandler, messageResponse } from '@/server/http';

export const POST = apiHandler(async () => {
  await deleteCurrentSession();

  return messageResponse('Logged out successfully.');
});
