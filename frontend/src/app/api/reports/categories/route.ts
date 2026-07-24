import { requireUser } from '@/server/auth';
import { apiHandler, dataResponse } from '@/server/http';
import { buildCategoryReport } from '@/server/reports';
import {
  searchParams,
  yearMonthSchema,
} from '@/server/validation';

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = yearMonthSchema.parse(searchParams(request));

  return dataResponse(
    await buildCategoryReport(user.id, filter.year, filter.month),
  );
});
