import { Prisma, ReceiptStatus } from '@/generated/prisma/client';
import { requireUser } from '@/server/auth';
import { parseDate } from '@/server/dates';
import { getDb } from '@/server/db';
import {
  ApiError,
  apiHandler,
  dataResponse,
} from '@/server/http';
import {
  notFound,
  requireOwnedCategory,
} from '@/server/ownership';
import { serializeReceipt } from '@/server/serializers';
import { expenseSchema, jsonBody, routeId } from '@/server/validation';

interface RouteContext {
  params: Promise<{ receipt: string }>;
}

export const POST = apiHandler(
  async (request: Request, context: RouteContext) => {
    const user = await requireUser();
    const id = routeId((await context.params).receipt);
    const input = expenseSchema.parse(await jsonBody(request));

    await requireOwnedCategory(user.id, input.category_id);

    const result = await getDb().$transaction(async (transaction) => {
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
        include: {
          analysis: { include: { suggestedCategory: true } },
          expense: { include: { category: true } },
        },
      });

      if (current.status === ReceiptStatus.confirmed) {
        if (!current.expense) {
          throw new ApiError(
            409,
            'The confirmed expense is no longer available.',
          );
        }

        return { receipt: current, created: false };
      }

      if (
        current.status !== ReceiptStatus.review_required ||
        !current.analysis
      ) {
        throw new ApiError(
          409,
          'The receipt is not ready for confirmation.',
        );
      }

      const expense = await transaction.expense.create({
        data: {
          userId: user.id,
          categoryId: input.category_id,
          title: input.title,
          amount: input.amount,
          spentAt: parseDate(input.spent_at),
          memo: input.memo,
        },
      });
      await transaction.receipt.update({
        where: { id },
        data: {
          expenseId: expense.id,
          status: ReceiptStatus.confirmed,
          confirmedAt: new Date(),
        },
      });
      const confirmed = await transaction.receipt.findUniqueOrThrow({
        where: { id },
        include: {
          analysis: { include: { suggestedCategory: true } },
          expense: { include: { category: true } },
        },
      });

      return { receipt: confirmed, created: true };
    });

    return dataResponse(
      serializeReceipt(result.receipt),
      result.created ? 201 : 200,
    );
  },
);
