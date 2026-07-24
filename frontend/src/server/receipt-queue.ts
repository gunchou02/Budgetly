import { after } from 'next/server';
import { ReceiptStatus } from '@/generated/prisma/client';
import { getDb } from '@/server/db';
import { processReceipt } from '@/server/receipts';
import { vercelQueue } from '@/server/vercel-queue';

export const RECEIPT_QUEUE_TOPIC = 'budgetly-receipts';

export interface ReceiptQueueMessage {
  receiptId: number;
}

function queueDriver(): 'inline' | 'vercel' {
  const configured = process.env.BUDGETLY_QUEUE_DRIVER?.trim();

  if (configured === 'inline' || configured === 'vercel') {
    return configured;
  }

  return 'inline';
}

export async function enqueueReceipt(receipt: {
  id: number;
  jobId: string;
  updatedAt: Date;
}): Promise<boolean> {
  try {
    if (queueDriver() === 'vercel') {
      await vercelQueue.send<ReceiptQueueMessage>(
        RECEIPT_QUEUE_TOPIC,
        { receiptId: receipt.id },
        {
          idempotencyKey: `receipt:${receipt.jobId}:${receipt.updatedAt.getTime()}`,
          retentionSeconds: 24 * 60 * 60,
        },
      );
    } else {
      after(async () => {
        await processReceipt(receipt.id, { finalAttempt: true });
      });
    }

    return true;
  } catch (error) {
    await getDb().receipt.updateMany({
      where: { id: receipt.id, status: ReceiptStatus.queued },
      data: {
        status: ReceiptStatus.failed,
        failureCode: 'queue_unavailable',
        failureMessage:
          'Receipt analysis could not be queued. Please retry later.',
      },
    });
    console.error('Receipt analysis could not be queued.', {
      receiptId: receipt.id,
      error,
    });

    return false;
  }
}
