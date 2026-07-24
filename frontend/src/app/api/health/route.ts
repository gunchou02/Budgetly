import { APP_TIME_ZONE } from '@/server/config';

export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok',
    service: 'Budgetly API',
    locale: 'ja',
    timezone: APP_TIME_ZONE,
  });
}
