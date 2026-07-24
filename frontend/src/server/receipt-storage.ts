import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, get, put } from '@vercel/blob';
import type { ValidatedReceiptImage } from '@/server/receipt-upload';

export type ReceiptStorageDisk = 'local' | 'vercel-blob';

export interface StoredReceiptImage {
  disk: ReceiptStorageDisk;
  path: string;
}

function storageDriver(): ReceiptStorageDisk {
  const configured = process.env.RECEIPT_STORAGE_DRIVER?.trim();

  if (configured === 'local' || configured === 'vercel-blob') {
    return configured;
  }

  return process.env.VERCEL ? 'vercel-blob' : 'local';
}

function localStorageRoot(): string {
  return path.join(process.cwd(), '.local-storage', 'receipts');
}

function localPath(key: string): string {
  const root = localStorageRoot();
  const resolved = path.resolve(root, key);

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid receipt storage key.');
  }

  return resolved;
}

export async function storeReceiptImage(input: {
  image: ValidatedReceiptImage;
  jobId: string;
  userId: number;
}): Promise<StoredReceiptImage> {
  const disk = storageDriver();
  const key = `${input.userId}/${input.jobId}.${input.image.extension}`;

  if (disk === 'vercel-blob') {
    const blob = await put(`receipts/${key}`, input.image.buffer, {
      access: 'private',
      addRandomSuffix: false,
      contentType: input.image.mimeType,
    });

    return { disk, path: blob.pathname };
  }

  const destination = localPath(key);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, input.image.buffer, { flag: 'wx' });

  return { disk, path: key };
}

export async function readReceiptImage(
  disk: string,
  imagePath: string,
): Promise<Buffer> {
  if (disk === 'vercel-blob') {
    const result = await get(imagePath, {
      access: 'private',
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error('Receipt image is missing.');
    }

    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  if (disk !== 'local') {
    throw new Error('Unsupported receipt storage driver.');
  }

  return readFile(localPath(imagePath));
}

export async function deleteReceiptImage(
  disk: string,
  imagePath: string,
): Promise<void> {
  if (disk === 'vercel-blob') {
    await del(imagePath);
    return;
  }

  if (disk !== 'local') {
    throw new Error('Unsupported receipt storage driver.');
  }

  try {
    await unlink(localPath(imagePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
