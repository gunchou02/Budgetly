import { del, get } from '@vercel/blob';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { getDb } from '@/server/db';
import {
  ApiError,
  apiHandler,
  dataResponse,
} from '@/server/http';
import { consumeRateLimit } from '@/server/rate-limit';
import { enqueueReceipt } from '@/server/receipt-queue';
import { validateReceiptImage } from '@/server/receipt-upload';
import { serializeReceipt } from '@/server/serializers';
import { jsonBody } from '@/server/validation';

const finalizeBlobSchema = z.object({
  job_id: z.uuid(),
  pathname: z.string().min(1).max(1000),
  original_name: z.string().max(255),
});

export const maxDuration = 60;

export const POST = apiHandler(async (request: Request) => {
  const user = await requireUser();
  const input = finalizeBlobSchema.parse(await jsonBody(request));
  const expectedPath = new RegExp(
    `^receipts/${user.id}/${input.job_id}\\.(jpg|png|webp)$`,
  );

  if (!expectedPath.test(input.pathname)) {
    throw new ApiError(403, 'This receipt upload path is not allowed.');
  }

  await consumeRateLimit({
    key: `receipt-upload:${user.id}`,
    limit: 10,
    windowSeconds: 60,
  });

  const existing = await getDb().receipt.findUnique({
    where: { jobId: input.job_id },
    include: {
      analysis: { include: { suggestedCategory: true } },
      expense: { include: { category: true } },
    },
  });

  if (existing) {
    if (
      existing.userId !== user.id ||
      existing.imagePath !== input.pathname
    ) {
      throw new ApiError(409, 'This receipt upload is already registered.');
    }

    return dataResponse(serializeReceipt(existing));
  }

  let keepBlob = false;

  try {
    const blob = await get(input.pathname, {
      access: 'private',
      useCache: false,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      throw new ApiError(422, '入力内容を確認してください。', {
        image: ['アップロードした画像を確認できませんでした。'],
      });
    }

    const buffer = Buffer.from(
      await new Response(blob.stream).arrayBuffer(),
    );
    const image = await validateReceiptImage(
      new File([Uint8Array.from(buffer)], input.original_name, {
        type: blob.blob.contentType,
      }),
    );
    const pathExtension = input.pathname.split('.').pop();

    if (pathExtension !== image.extension) {
      throw new ApiError(422, '入力内容を確認してください。', {
        image: ['JPEG、PNG、WebP画像を選択してください。'],
      });
    }

    const receipt = await getDb().receipt.create({
      data: {
        userId: user.id,
        jobId: input.job_id,
        status: 'queued',
        storageDisk: 'vercel-blob',
        imagePath: input.pathname,
        originalName: image.originalName,
        mimeType: image.mimeType,
        fileSize: image.size,
      },
    });

    keepBlob = true;
    await enqueueReceipt(receipt);

    const responseReceipt = await getDb().receipt.findUniqueOrThrow({
      where: { id: receipt.id },
      include: {
        analysis: { include: { suggestedCategory: true } },
        expense: { include: { category: true } },
      },
    });

    return dataResponse(serializeReceipt(responseReceipt), 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const duplicate = await getDb().receipt.findUnique({
        where: { jobId: input.job_id },
        include: {
          analysis: { include: { suggestedCategory: true } },
          expense: { include: { category: true } },
        },
      });

      if (
        duplicate &&
        duplicate.userId === user.id &&
        duplicate.imagePath === input.pathname
      ) {
        keepBlob = true;
        return dataResponse(serializeReceipt(duplicate));
      }
    }

    throw error;
  } finally {
    if (!keepBlob) {
      await del(input.pathname).catch(() => undefined);
    }
  }
});
