import { requireUser } from '@/server/auth';
import { apiHandler, dataResponse } from '@/server/http';
import { consumeRateLimit } from '@/server/rate-limit';
import { buildSpendingInsights } from '@/server/reports';
import {
  searchParams,
  yearMonthSchema,
} from '@/server/validation';

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = yearMonthSchema.parse(searchParams(request));

  await consumeRateLimit({
    key: `ai-report:${user.id}`,
    limit: 10,
    windowSeconds: 60,
  });

  return dataResponse(
    await buildSpendingInsights(user.id, filter.year, filter.month),
  );
});
