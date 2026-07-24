import { QueueClient } from '@vercel/queue';
import type { VercelRegion } from '@vercel/queue';

export const vercelQueue = new QueueClient({
  region: (process.env.VERCEL_REGION ?? 'iad1') as VercelRegion,
});
