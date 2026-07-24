import type { ReceiptQueueMessage } from '@/server/receipt-queue';
import { processReceipt } from '@/server/receipts';
import { vercelQueue } from '@/server/vercel-queue';

export const maxDuration = 60;

export const POST = vercelQueue.handleCallback<ReceiptQueueMessage>(
  async (message, metadata) => {
    await processReceipt(message.receiptId, {
      finalAttempt: metadata.deliveryCount >= 3,
    });
  },
  {
    visibilityTimeoutSeconds: 90,
  },
);
