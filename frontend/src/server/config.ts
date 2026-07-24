export const APP_TIME_ZONE = 'Asia/Tokyo';
export const SESSION_COOKIE_NAME = 'budgetly_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MAX_PIXELS = 40_000_000;
export const RECEIPT_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}
