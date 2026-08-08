import { requireMember } from '@/server/auth';
import { apiHandler, dataResponse } from '@/server/http';
import { consumeUserAndAddressRateLimits } from '@/server/rate-limit';
import { buildSpendingInsights } from '@/server/reports';
import {
  searchParams,
  yearMonthSchema,
} from '@/server/validation';

export const GET = apiHandler(async (request: Request) => {
  const user = await requireMember();
  const filter = yearMonthSchema.parse(searchParams(request));

  await consumeUserAndAddressRateLimits({
    addressLimit: 20,
    request,
    scope: 'ai-report',
    userId: user.id,
    userLimit: 10,
    windowSeconds: 60,
  });

  return dataResponse(
    await buildSpendingInsights(user.id, filter.year, filter.month),
  );
});
