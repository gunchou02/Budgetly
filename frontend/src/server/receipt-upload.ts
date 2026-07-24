import { imageSize } from 'image-size';
import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_BYTES,
  RECEIPT_MAX_PIXELS,
} from '@/server/config';
import { ApiError } from '@/server/http';

const MIME_BY_IMAGE_TYPE = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

type ReceiptMimeType =
  (typeof MIME_BY_IMAGE_TYPE)[keyof typeof MIME_BY_IMAGE_TYPE];

export interface ValidatedReceiptImage {
  buffer: Buffer;
  extension: 'jpg' | 'png' | 'webp';
  mimeType: ReceiptMimeType;
  originalName: string;
  size: number;
}

function imageError(message: string, status = 422): ApiError {
  return new ApiError(status, '入力内容を確認してください。', {
    image: [message],
  });
}

function sanitizeOriginalName(name: string, extension: string): string {
  const basename = name.replaceAll('\\', '/').split('/').pop() ?? '';
  const sanitized = basename
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return sanitized || `receipt.${extension}`;
}

export async function validateReceiptImage(
  file: File,
): Promise<ValidatedReceiptImage> {
  if (file.size <= 0) {
    throw imageError('レシート画像を選択してください。');
  }

  if (file.size > RECEIPT_MAX_BYTES) {
    throw imageError('画像サイズは5MB以下にしてください。', 413);
  }

  if (file.type && !RECEIPT_ALLOWED_MIME_TYPES.has(file.type)) {
    throw imageError('JPEG、PNG、WebP画像を選択してください。');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let dimensions: ReturnType<typeof imageSize>;

  try {
    dimensions = imageSize(buffer);
  } catch {
    throw imageError('JPEG、PNG、WebP画像を選択してください。');
  }

  const detectedType = dimensions.type as keyof typeof MIME_BY_IMAGE_TYPE;
  const mimeType = MIME_BY_IMAGE_TYPE[detectedType];

  if (!mimeType || (file.type && file.type !== mimeType)) {
    throw imageError('JPEG、PNG、WebP画像を選択してください。');
  }

  if (!dimensions.width || !dimensions.height) {
    throw imageError('画像のサイズを確認できません。');
  }

  if (dimensions.width * dimensions.height > RECEIPT_MAX_PIXELS) {
    throw imageError('画像の解像度が大きすぎます。');
  }

  const extension = detectedType === 'jpg' ? 'jpg' : detectedType;

  return {
    buffer,
    extension,
    mimeType,
    originalName: sanitizeOriginalName(file.name, extension),
    size: file.size,
  };
}
