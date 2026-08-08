import { requireMember } from '@/server/auth';
import { getDb } from '@/server/db';
import { apiHandler, dataResponse } from '@/server/http';
import { notFound } from '@/server/ownership';
import { deleteReceiptImage } from '@/server/receipt-storage';
import { serializeReceipt } from '@/server/serializers';
import { routeId } from '@/server/validation';

interface RouteContext {
  params: Promise<{ receipt: string }>;
}

export const GET = apiHandler(
  async (_request: Request, context: RouteContext) => {
    const user = await requireMember();
    const id = routeId((await context.params).receipt);
    const receipt = await getDb().receipt.findFirst({
      where: { id, userId: user.id },
      include: {
        analysis: { include: { suggestedCategory: true } },
        expense: { include: { category: true } },
      },
    });

    if (!receipt) {
      notFound();
    }

    return dataResponse(serializeReceipt(receipt));
  },
);

export const DELETE = apiHandler(
  async (_request: Request, context: RouteContext) => {
    const user = await requireMember();
    const id = routeId((await context.params).receipt);
    const receipt = await getDb().receipt.findFirst({
      where: { id, userId: user.id },
    });

    if (!receipt) {
      notFound();
    }

    await deleteReceiptImage(receipt.storageDisk, receipt.imagePath);
    await getDb().receipt.delete({ where: { id } });

    return new Response(null, { status: 204 });
  },
);
