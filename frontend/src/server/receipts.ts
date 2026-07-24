import { ReceiptStatus } from '@/generated/prisma/client';
import {
  analyzeBlobReceipt,
  analyzeReceipt,
  ReceiptAnalysisFailure,
} from '@/server/ai-client';
import { parseDate } from '@/server/dates';
import { getDb } from '@/server/db';
import { readReceiptImage } from '@/server/receipt-storage';

interface ProcessReceiptOptions {
  finalAttempt: boolean;
}

function failureDetails(error: unknown): {
  code: string;
  message: string;
} {
  if (error instanceof ReceiptAnalysisFailure) {
    return { code: error.code, message: error.message };
  }

  if (
    error instanceof Error &&
    error.message === 'Receipt image is missing.'
  ) {
    return {
      code: 'receipt_image_missing',
      message: 'The receipt image is no longer available.',
    };
  }

  return {
    code: 'analysis_failed',
    message: 'The receipt could not be analyzed.',
  };
}

export async function processReceipt(
  receiptId: number,
  options: ProcessReceiptOptions,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  const staleProcessingAt = new Date(now.getTime() - 2 * 60 * 1000);
  const claimed = await db.receipt.updateMany({
    where: {
      id: receiptId,
      OR: [
        { status: ReceiptStatus.queued },
        {
          status: ReceiptStatus.processing,
          processingStartedAt: { lt: staleProcessingAt },
        },
      ],
    },
    data: {
      status: ReceiptStatus.processing,
      failureCode: null,
      failureMessage: null,
      processingStartedAt: now,
    },
  });

  if (claimed.count === 0) {
    return;
  }

  try {
    const receipt = await db.receipt.findUnique({
      where: { id: receiptId },
      include: {
        user: {
          include: {
            categories: {
              where: { type: 'expense' },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              take: 100,
            },
          },
        },
      },
    });

    if (!receipt) {
      return;
    }

    if (receipt.user.categories.length === 0) {
      throw new ReceiptAnalysisFailure(
        'category_candidates_missing',
        'No expense categories are available for receipt analysis.',
      );
    }

    const payload = {
      job_id: receipt.jobId,
      image_key: receipt.imagePath,
      mime_type: receipt.mimeType as
        | 'image/jpeg'
        | 'image/png'
        | 'image/webp',
      language: 'ja' as const,
      category_candidates: receipt.user.categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    };
    const analysis =
      receipt.storageDisk === 'vercel-blob'
        ? await analyzeBlobReceipt(payload)
        : await analyzeReceipt({
            image: await readReceiptImage(
              receipt.storageDisk,
              receipt.imagePath,
            ),
            originalName: receipt.originalName,
            payload,
          });
    const categoryIds = new Set(
      receipt.user.categories.map((category) => category.id),
    );

    if (
      analysis.suggested_category_id !== null &&
      !categoryIds.has(analysis.suggested_category_id)
    ) {
      throw new ReceiptAnalysisFailure(
        'invalid_ai_response',
        'The receipt analysis service returned an invalid response.',
      );
    }

    await db.$transaction(async (transaction) => {
      const current = await transaction.receipt.findUnique({
        where: { id: receiptId },
        select: { status: true },
      });

      if (!current || current.status !== ReceiptStatus.processing) {
        return;
      }

      await transaction.receiptAnalysis.upsert({
        where: { receiptId },
        update: {
          suggestedCategoryId: analysis.suggested_category_id,
          provider: analysis.provider,
          merchant: analysis.merchant,
          spentAt: analysis.spent_at
            ? parseDate(analysis.spent_at)
            : null,
          amount: analysis.amount,
          confidence: analysis.confidence,
          extractedText: analysis.extracted_text,
        },
        create: {
          receiptId,
          suggestedCategoryId: analysis.suggested_category_id,
          provider: analysis.provider,
          merchant: analysis.merchant,
          spentAt: analysis.spent_at
            ? parseDate(analysis.spent_at)
            : null,
          amount: analysis.amount,
          confidence: analysis.confidence,
          extractedText: analysis.extracted_text,
        },
      });
      await transaction.receipt.update({
        where: { id: receiptId },
        data: {
          status: ReceiptStatus.review_required,
          failureCode: null,
          failureMessage: null,
          analyzedAt: new Date(),
        },
      });
    });
  } catch (error) {
    const failure = failureDetails(error);

    await db.$transaction([
      db.receiptAnalysis.deleteMany({ where: { receiptId } }),
      db.receipt.updateMany({
        where: {
          id: receiptId,
          status: ReceiptStatus.processing,
        },
        data: options.finalAttempt
          ? {
              status: ReceiptStatus.failed,
              failureCode: failure.code,
              failureMessage: failure.message,
              analyzedAt: null,
            }
          : {
              status: ReceiptStatus.queued,
              failureCode: null,
              failureMessage: null,
              analyzedAt: null,
            },
      }),
    ]);

    if (!options.finalAttempt) {
      throw error;
    }

    console.error('Receipt analysis failed.', {
      receiptId,
      failureCode: failure.code,
    });
  }
}
