import { randomUUID } from 'node:crypto';
import { requireUser } from '@/server/auth';
import { getDb } from '@/server/db';
import { ApiError, apiHandler, dataResponse } from '@/server/http';
import { consumeRateLimit } from '@/server/rate-limit';
import { enqueueReceipt } from '@/server/receipt-queue';
import {
  deleteReceiptImage,
  storeReceiptImage,
} from '@/server/receipt-storage';
import { validateReceiptImage } from '@/server/receipt-upload';
import { serializeReceipt } from '@/server/serializers';

export const maxDuration = 60;

export const POST = apiHandler(async (request: Request) => {
  const user = await requireUser();

  await consumeRateLimit({
    key: `receipt-upload:${user.id}`,
    limit: 10,
    windowSeconds: 60,
  });

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, '画像をアップロードできませんでした。');
  }

  const file = form.get('image');

  if (!(file instanceof File)) {
    throw new ApiError(422, '入力内容を確認してください。', {
      image: ['レシート画像を選択してください。'],
    });
  }

  const image = await validateReceiptImage(file);
  const jobId = randomUUID();
  const stored = await storeReceiptImage({
    userId: user.id,
    jobId,
    image,
  });
  let receipt;

  try {
    receipt = await getDb().receipt.create({
      data: {
        userId: user.id,
        jobId,
        status: 'queued',
        storageDisk: stored.disk,
        imagePath: stored.path,
        originalName: image.originalName,
        mimeType: image.mimeType,
        fileSize: image.size,
      },
    });
  } catch (error) {
    await deleteReceiptImage(stored.disk, stored.path);
    throw error;
  }

  await enqueueReceipt(receipt);

  const responseReceipt = await getDb().receipt.findUniqueOrThrow({
    where: { id: receipt.id },
    include: {
      analysis: { include: { suggestedCategory: true } },
      expense: { include: { category: true } },
    },
  });

  return dataResponse(serializeReceipt(responseReceipt), 201);
});
