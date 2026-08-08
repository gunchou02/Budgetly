import { Prisma, ReceiptStatus } from '@/generated/prisma/client';
import { requireMember } from '@/server/auth';
import { getDb } from '@/server/db';
import {
  ApiError,
  apiHandler,
  dataResponse,
} from '@/server/http';
import { notFound } from '@/server/ownership';
import { consumeUserAndAddressRateLimits } from '@/server/rate-limit';
import { enqueueReceipt } from '@/server/receipt-queue';
import { serializeReceipt } from '@/server/serializers';
import { routeId } from '@/server/validation';

interface RouteContext {
  params: Promise<{ receipt: string }>;
}

export const POST = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireMember();
    const id = routeId((await context.params).receipt);

    await consumeUserAndAddressRateLimits({
      addressLimit: 20,
      request,
      scope: 'receipt-upload',
      userId: user.id,
      userLimit: 10,
      windowSeconds: 60,
    });

    const receipt = await getDb().$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`
          SELECT "id"
          FROM "receipts"
          WHERE "id" = ${id}
            AND "user_id" = ${user.id}
          FOR UPDATE
        `,
      );

      if (locked.length === 0) {
        notFound();
      }

      const current = await transaction.receipt.findUniqueOrThrow({
        where: { id },
      });

      if (current.status !== ReceiptStatus.failed) {
        throw new ApiError(
          409,
          'Only failed receipt analyses can be retried.',
        );
      }

      await transaction.receiptAnalysis.deleteMany({
        where: { receiptId: id },
      });

      return transaction.receipt.update({
        where: { id },
        data: {
          status: ReceiptStatus.queued,
          failureCode: null,
          failureMessage: null,
          processingStartedAt: null,
          analyzedAt: null,
        },
      });
    });
    const queued = await enqueueReceipt(receipt);
    const responseReceipt = await getDb().receipt.findUniqueOrThrow({
      where: { id },
      include: {
        analysis: { include: { suggestedCategory: true } },
        expense: { include: { category: true } },
      },
    });

    if (!queued) {
      return Response.json(
        {
          message:
            'Receipt analysis could not be queued. Please retry later.',
          data: serializeReceipt(responseReceipt),
        },
        { status: 503 },
      );
    }

    return dataResponse(serializeReceipt(responseReceipt), 202);
  },
);
