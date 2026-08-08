import { describe, expect, it } from 'vitest';
import { RECEIPT_MAX_BYTES } from '@/server/config';
import { validateReceiptImage } from '@/server/receipt-upload';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('receipt image validation', () => {
  it('accepts a valid PNG based on its actual bytes', async () => {
    const result = await validateReceiptImage(
      new File([ONE_PIXEL_PNG], 'receipt.png', { type: 'image/png' }),
    );

    expect(result).toMatchObject({
      extension: 'png',
      mimeType: 'image/png',
      originalName: 'receipt.png',
      size: ONE_PIXEL_PNG.length,
    });
  });

  it('rejects a declared MIME type that does not match the image', async () => {
    await expect(
      validateReceiptImage(
        new File([ONE_PIXEL_PNG], 'receipt.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects unsupported image signatures before accepting the upload', async () => {
    await expect(
      validateReceiptImage(
        new File([Buffer.from('icns-invalid-image')], 'receipt.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('rejects images larger than five megabytes before decoding', async () => {
    await expect(
      validateReceiptImage(
        new File(
          [new Uint8Array(RECEIPT_MAX_BYTES + 1)],
          'too-large.png',
          { type: 'image/png' },
        ),
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
