import {
  handleUpload,
  type HandleUploadBody,
} from '@vercel/blob/client';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { RECEIPT_MAX_BYTES } from '@/server/config';
import { ApiError, apiHandler } from '@/server/http';
import { jsonBody } from '@/server/validation';

const clientPayloadSchema = z.object({
  job_id: z.uuid(),
});

export const POST = apiHandler(async (request: Request) => {
  const body = (await jsonBody(request)) as HandleUploadBody;
  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const user = await requireUser();
      let parsedPayload: unknown;

      try {
        parsedPayload = JSON.parse(clientPayload ?? '');
      } catch {
        throw new ApiError(400, 'Invalid receipt upload payload.');
      }

      const payload = clientPayloadSchema.parse(parsedPayload);
      const expectedPath = new RegExp(
        `^receipts/${user.id}/${payload.job_id}\\.(jpg|png|webp)$`,
      );

      if (!expectedPath.test(pathname)) {
        throw new ApiError(403, 'This receipt upload path is not allowed.');
      }

      return {
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maximumSizeInBytes: RECEIPT_MAX_BYTES,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify({
          user_id: user.id,
          job_id: payload.job_id,
        }),
      };
    },
  });

  return Response.json(result);
});
