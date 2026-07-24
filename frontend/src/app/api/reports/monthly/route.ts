import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { apiHandler, dataResponse } from '@/server/http';
import { buildAnnualReport } from '@/server/reports';
import { searchParams, yearSchema } from '@/server/validation';

const annualReportSchema = z.object({ year: yearSchema });

export const GET = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const filter = annualReportSchema.parse(searchParams(request));

  return dataResponse(await buildAnnualReport(user.id, filter.year));
});
