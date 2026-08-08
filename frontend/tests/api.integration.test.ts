import { describe, expect, it } from 'vitest';
import { getDb } from '@/server/db';

const BASE_URL = process.env.BUDGETLY_INTEGRATION_BASE_URL;
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface ApiResult {
  body: unknown;
  response: Response;
}

async function apiRequest(
  path: string,
  options: RequestInit = {},
  cookie?: string,
): Promise<ApiResult> {
  const headers = new Headers(options.headers);

  if (cookie) {
    headers.set('Cookie', cookie);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const body =
    response.status === 204 ? null : await response.json();

  return { response, body };
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function jsonRequestFromAddress(
  method: string,
  body: unknown,
  clientAddress: string,
): RequestInit {
  return {
    ...jsonRequest(method, body),
    headers: {
      'Content-Type': 'application/json',
      'X-Vercel-Forwarded-For': clientAddress,
    },
  };
}

function guestRequest(clientAddress: string): RequestInit {
  return jsonRequestFromAddress('POST', {}, clientAddress);
}

function responseCookie(response: Response): string {
  const cookie = response.headers.get('set-cookie')?.split(';')[0];

  if (!cookie) {
    throw new Error('Session cookie was not returned.');
  }

  return cookie;
}

describe.skipIf(!BASE_URL)('Budgetly API integration', () => {
  it(
    'runs authentication, CRUD, reports, ownership, and receipt flows',
    async () => {
      const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const db = getDb();
      const unauthenticated = await apiRequest('/api/me');
      expect(unauthenticated.response.status).toBe(401);

      const unauthorizedGuestCleanup = await apiRequest(
        '/api/cron/guest-cleanup',
      );
      expect(unauthorizedGuestCleanup.response.status).toBe(401);

      const invalidGuestRequest = await apiRequest('/api/guest', {
        method: 'POST',
      });
      expect(invalidGuestRequest.response.status).toBe(415);

      const guestCreatedAt = Date.now();
      const firstGuest = await apiRequest(
        '/api/guest',
        guestRequest(`198.51.100.${Math.floor(Math.random() * 100) + 1}`),
      );
      expect(firstGuest.response.status).toBe(201);
      expect(firstGuest.body).toMatchObject({
        data: {
          user: {
            email: null,
            guest_expires_at: expect.any(String),
            id: expect.any(Number),
            is_guest: true,
            name: 'ゲスト',
          },
        },
      });
      const firstGuestSetCookie =
        firstGuest.response.headers.get('set-cookie') ?? '';
      expect(firstGuestSetCookie).toContain('HttpOnly');
      expect(firstGuestSetCookie).toContain('Path=/');
      expect(firstGuestSetCookie.toLowerCase()).toContain('samesite=lax');
      const firstGuestUser = (
        firstGuest.body as {
          data: { user: { guest_expires_at: string; id: number } };
        }
      ).data.user;
      const guestExpiresAt = Date.parse(firstGuestUser.guest_expires_at);
      const cookieExpiresMatch = firstGuestSetCookie.match(
        /Expires=([^;]+)/i,
      );

      expect(guestExpiresAt - guestCreatedAt).toBeGreaterThan(
        24 * 60 * 60 * 1000 - 60_000,
      );
      expect(guestExpiresAt - guestCreatedAt).toBeLessThan(
        24 * 60 * 60 * 1000 + 60_000,
      );
      expect(cookieExpiresMatch).not.toBeNull();
      expect(
        Math.abs(Date.parse(cookieExpiresMatch?.[1] ?? '') - guestExpiresAt),
      ).toBeLessThan(1_000);
      const firstGuestCookie = responseCookie(firstGuest.response);

      const guestMe = await apiRequest('/api/me', {}, firstGuestCookie);
      expect(guestMe.response.status).toBe(200);
      expect(guestMe.body).toMatchObject({
        data: {
          email: null,
          guest_expires_at: expect.any(String),
          is_guest: true,
        },
      });

      const guestAiReport = await apiRequest(
        '/api/reports/insights?year=2026&month=7',
        {},
        firstGuestCookie,
      );
      expect(guestAiReport.response.status).toBe(403);
      expect(guestAiReport.body).toMatchObject({
        error: { code: 'member_account_required' },
      });

      const guestReceiptUpload = await apiRequest(
        '/api/receipts',
        { method: 'POST', body: new FormData() },
        firstGuestCookie,
      );
      expect(guestReceiptUpload.response.status).toBe(403);

      const guestCategories = await apiRequest(
        '/api/categories',
        {},
        firstGuestCookie,
      );
      expect(guestCategories.response.status).toBe(200);
      const guestCategoryRows = (
        guestCategories.body as {
          data: Array<{ id: number; type: string }>;
        }
      ).data;
      expect(guestCategoryRows).toHaveLength(19);
      const guestExpenseCategory = guestCategoryRows.find(
        (category) => category.type === 'expense',
      );
      const guestFixedCategory = guestCategoryRows.find(
        (category) => category.type === 'fixed',
      );
      expect(guestExpenseCategory).toBeDefined();
      expect(guestFixedCategory).toBeDefined();

      const guestBudget = await apiRequest(
        '/api/budgets',
        jsonRequest('POST', {
          year: 2026,
          month: 7,
          amount: 80_000,
        }),
        firstGuestCookie,
      );
      expect(guestBudget.response.status).toBe(201);
      const guestBudgetId = (
        guestBudget.body as { data: { id: number } }
      ).data.id;

      const guestExpense = await apiRequest(
        '/api/expenses',
        jsonRequest('POST', {
          category_id: guestExpenseCategory?.id,
          title: 'ゲストのランチ',
          amount: 1_200,
          spent_at: '2026-07-24',
          memo: '',
        }),
        firstGuestCookie,
      );
      expect(guestExpense.response.status).toBe(201);

      const guestSubscription = await apiRequest(
        '/api/subscriptions',
        jsonRequest('POST', {
          category_id: guestFixedCategory?.id,
          name: 'ゲスト動画サービス',
          amount: 1_500,
          billing_cycle: 'monthly',
          billing_day: 10,
          started_at: '2026-01-01',
          memo: '',
        }),
        firstGuestCookie,
      );
      expect(guestSubscription.response.status).toBe(201);

      const guestDashboard = await apiRequest(
        '/api/dashboard?year=2026&month=7',
        {},
        firstGuestCookie,
      );
      expect(guestDashboard.response.status).toBe(200);
      expect(guestDashboard.body).toMatchObject({
        data: {
          budget: 80_000,
          expense_total: 1_200,
          remaining: 77_300,
          subscription_total: 1_500,
          total_spent: 2_700,
        },
      });

      await db.category.createMany({
        data: Array.from({ length: 31 }, (_, index) => ({
          userId: firstGuestUser.id,
          name: `ゲスト上限確認${index + 1}`,
          color: '#71717A',
          icon: 'more-horizontal',
          type: 'expense' as const,
          sortOrder: 100 + index,
          isDefault: false,
        })),
      });
      const guestCategoryOverQuota = await apiRequest(
        '/api/categories',
        jsonRequest('POST', { name: '上限超過', type: 'expense' }),
        firstGuestCookie,
      );
      expect(guestCategoryOverQuota.response.status).toBe(403);
      expect(guestCategoryOverQuota.body).toMatchObject({
        error: { code: 'guest_resource_limit_reached' },
      });

      await db.rateLimitBucket.update({
        where: { key: `guest-mutation:${firstGuestUser.id}` },
        data: {
          count: 120,
          resetAt: new Date(Date.now() + 60_000),
        },
      });
      const guestMutationRateLimited = await apiRequest(
        '/api/budgets',
        jsonRequest('POST', {
          year: 2026,
          month: 8,
          amount: 1,
        }),
        firstGuestCookie,
      );
      expect(guestMutationRateLimited.response.status).toBe(429);
      expect(guestMutationRateLimited.body).toMatchObject({
        error: { code: 'rate_limit_exceeded' },
      });

      const secondGuest = await apiRequest(
        '/api/guest',
        guestRequest(`203.0.113.${Math.floor(Math.random() * 100) + 1}`),
      );
      expect(secondGuest.response.status).toBe(201);
      const secondGuestId = (
        secondGuest.body as { data: { user: { id: number } } }
      ).data.user.id;
      const secondGuestCookie = responseCookie(secondGuest.response);

      const crossGuestUpdate = await apiRequest(
        `/api/budgets/${guestBudgetId}`,
        jsonRequest('PUT', {
          year: 2026,
          month: 7,
          amount: 1,
        }),
        secondGuestCookie,
      );
      expect(crossGuestUpdate.response.status).toBe(404);

      const guestSessionReplacement = await apiRequest(
        '/api/guest',
        guestRequest('203.0.113.200'),
        secondGuestCookie,
      );
      expect(guestSessionReplacement.response.status).toBe(409);

      const formLogout = await apiRequest(
        '/api/logout',
        { method: 'POST' },
        secondGuestCookie,
      );
      expect(formLogout.response.status).toBe(415);
      const secondGuestAfterFormLogout = await apiRequest(
        '/api/me',
        {},
        secondGuestCookie,
      );
      expect(secondGuestAfterFormLogout.response.status).toBe(200);

      const secondGuestLogout = await apiRequest(
        '/api/logout',
        jsonRequest('POST', {}),
        secondGuestCookie,
      );
      expect(secondGuestLogout.response.status).toBe(200);
      expect(
        await db.user.findUnique({ where: { id: secondGuestId } }),
      ).toBeNull();
      const secondGuestAfterLogout = await apiRequest(
        '/api/me',
        {},
        secondGuestCookie,
      );
      expect(secondGuestAfterLogout.response.status).toBe(401);

      const firstGuestLogout = await apiRequest(
        '/api/logout',
        jsonRequest('POST', {}),
        firstGuestCookie,
      );
      expect(firstGuestLogout.response.status).toBe(200);
      expect(
        await db.user.findUnique({ where: { id: firstGuestUser.id } }),
      ).toBeNull();
      expect(
        await db.monthlyBudget.findUnique({
          where: { id: guestBudgetId },
        }),
      ).toBeNull();
      const firstGuestAfterLogout = await apiRequest(
        '/api/me',
        {},
        firstGuestCookie,
      );
      expect(firstGuestAfterLogout.response.status).toBe(401);

      const rateLimitAddress = `2001:db8::${Date.now().toString(16)}`;
      const rateLimitedGuestCookies: string[] = [];

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const allowedGuest = await apiRequest(
          '/api/guest',
          guestRequest(rateLimitAddress),
        );
        expect(allowedGuest.response.status).toBe(201);
        rateLimitedGuestCookies.push(responseCookie(allowedGuest.response));
      }

      const rateLimitedGuest = await apiRequest(
        '/api/guest',
        guestRequest(rateLimitAddress),
      );
      expect(rateLimitedGuest.response.status).toBe(429);
      expect(rateLimitedGuest.response.headers.get('retry-after')).toMatch(
        /^\d+$/,
      );
      expect(rateLimitedGuest.body).toMatchObject({
        error: { code: 'rate_limit_exceeded' },
      });

      for (const guestCookie of rateLimitedGuestCookies) {
        const guestLogout = await apiRequest(
          '/api/logout',
          jsonRequest('POST', {}),
          guestCookie,
        );
        expect(guestLogout.response.status).toBe(200);
      }

      const requestExpiryGuest = await apiRequest(
        '/api/guest',
        guestRequest(`2001:db8::${(Date.now() + 4).toString(16)}`),
      );
      expect(requestExpiryGuest.response.status).toBe(201);
      const requestExpiryGuestId = (
        requestExpiryGuest.body as { data: { user: { id: number } } }
      ).data.user.id;
      const requestExpiryGuestCookie = responseCookie(
        requestExpiryGuest.response,
      );

      await db.user.update({
        where: { id: requestExpiryGuestId },
        data: { guestExpiresAt: new Date(Date.now() - 60_000) },
      });
      const expiredGuestMe = await apiRequest(
        '/api/me',
        {},
        requestExpiryGuestCookie,
      );
      expect(expiredGuestMe.response.status).toBe(401);
      expect(
        await db.user.findUnique({ where: { id: requestExpiryGuestId } }),
      ).toBeNull();

      const expiringGuest = await apiRequest(
        '/api/guest',
        guestRequest(`2001:db8::${(Date.now() + 1).toString(16)}`),
      );
      expect(expiringGuest.response.status).toBe(201);
      const expiringGuestId = (
        expiringGuest.body as { data: { user: { id: number } } }
      ).data.user.id;
      const expiredBucketKey = `integration-expired-${unique}`;
      await db.user.update({
        where: { id: expiringGuestId },
        data: { guestExpiresAt: new Date(Date.now() - 60_000) },
      });
      await db.rateLimitBucket.create({
        data: {
          key: expiredBucketKey,
          count: 1,
          resetAt: new Date(Date.now() - 60_000),
        },
      });

      const authorizedGuestCleanup = await apiRequest(
        '/api/cron/guest-cleanup',
        {
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
        },
      );
      expect(authorizedGuestCleanup.response.status).toBe(200);
      expect(authorizedGuestCleanup.body).toMatchObject({
        data: {
          deleted_accounts: expect.any(Number),
          deleted_rate_limit_buckets: expect.any(Number),
        },
      });
      expect(
        await db.user.findUnique({ where: { id: expiringGuestId } }),
      ).toBeNull();
      expect(
        await db.rateLimitBucket.findUnique({
          where: { key: expiredBucketKey },
        }),
      ).toBeNull();

      const registration = await apiRequest(
        '/api/register',
        jsonRequestFromAddress(
          'POST',
          {
            name: 'Integration User',
            email: `integration-${unique}@example.com`,
            password: 'password123',
            password_confirmation: 'password123',
          },
          `2001:db8::${(Date.now() + 2).toString(16)}`,
        ),
      );
      expect(registration.response.status).toBe(201);
      expect(registration.body).toMatchObject({
        data: { user: { id: expect.any(Number), is_guest: false } },
      });
      const registeredUserId = (
        registration.body as { data: { user: { id: number } } }
      ).data.user.id;
      const cookie = responseCookie(registration.response);

      const categoriesResult = await apiRequest(
        '/api/categories',
        {},
        cookie,
      );
      expect(categoriesResult.response.status).toBe(200);
      const categories = (
        categoriesResult.body as {
          data: Array<{ id: number; type: string }>;
        }
      ).data;
      expect(categories).toHaveLength(19);
      const expenseCategory = categories.find(
        (category) => category.type === 'expense',
      );
      const fixedCategory = categories.find(
        (category) => category.type === 'fixed',
      );
      expect(expenseCategory).toBeDefined();
      expect(fixedCategory).toBeDefined();

      const budgetResult = await apiRequest(
        '/api/budgets',
        jsonRequest('POST', {
          year: 2026,
          month: 7,
          amount: 100_000,
        }),
        cookie,
      );
      expect(budgetResult.response.status).toBe(201);
      const budgetId = (
        budgetResult.body as { data: { id: number } }
      ).data.id;

      const duplicateBudget = await apiRequest(
        '/api/budgets',
        jsonRequest('POST', {
          year: 2026,
          month: 7,
          amount: 200_000,
        }),
        cookie,
      );
      expect(duplicateBudget.response.status).toBe(422);

      const expenseResult = await apiRequest(
        '/api/expenses',
        jsonRequest('POST', {
          category_id: expenseCategory?.id,
          title: 'Lunch',
          amount: 1200,
          spent_at: '2026-07-24',
          memo: '',
        }),
        cookie,
      );
      expect(expenseResult.response.status).toBe(201);

      const subscriptionResult = await apiRequest(
        '/api/subscriptions',
        jsonRequest('POST', {
          category_id: fixedCategory?.id,
          name: 'Video Service',
          amount: 1500,
          billing_cycle: 'monthly',
          billing_day: 10,
          started_at: '2026-01-01',
          memo: '',
        }),
        cookie,
      );
      expect(subscriptionResult.response.status).toBe(201);

      const dashboardResult = await apiRequest(
        '/api/dashboard?year=2026&month=7',
        {},
        cookie,
      );
      expect(dashboardResult.body).toMatchObject({
        data: {
          budget: 100_000,
          expense_total: 1200,
          subscription_total: 1500,
          total_spent: 2700,
          remaining: 97_300,
        },
      });

      const insightsResult = await apiRequest(
        '/api/reports/insights?year=2026&month=7',
        {},
        cookie,
      );
      expect(insightsResult.response.status).toBe(200);
      expect(insightsResult.body).toMatchObject({
        data: { provider: 'fake', period: '2026-07' },
      });

      const secondRegistration = await apiRequest(
        '/api/register',
        jsonRequestFromAddress(
          'POST',
          {
            name: 'Other User',
            email: `other-${unique}@example.com`,
            password: 'password123',
            password_confirmation: 'password123',
          },
          `2001:db8::${(Date.now() + 3).toString(16)}`,
        ),
      );
      const secondCookie = responseCookie(secondRegistration.response);
      const crossUserUpdate = await apiRequest(
        `/api/budgets/${budgetId}`,
        jsonRequest('PUT', {
          year: 2026,
          month: 7,
          amount: 1,
        }),
        secondCookie,
      );
      expect(crossUserUpdate.response.status).toBe(404);

      const receiptForm = new FormData();
      receiptForm.append(
        'image',
        new File([ONE_PIXEL_PNG], 'receipt.png', {
          type: 'image/png',
        }),
      );
      const uploadResult = await apiRequest(
        '/api/receipts',
        { method: 'POST', body: receiptForm },
        cookie,
      );
      expect(uploadResult.response.status).toBe(201);
      let receipt = (
        uploadResult.body as {
          data: {
            id: number;
            status: string;
            analysis: null | {
              amount: number | null;
              merchant: string | null;
              spent_at: string | null;
            };
          };
        }
      ).data;

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (receipt.status === 'review_required') {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
        const pollResult = await apiRequest(
          `/api/receipts/${receipt.id}`,
          {},
          cookie,
        );
        receipt = (
          pollResult.body as { data: typeof receipt }
        ).data;
      }

      expect(receipt.status).toBe('review_required');
      expect(receipt.analysis).not.toBeNull();

      const confirmation = await apiRequest(
        `/api/receipts/${receipt.id}/confirm`,
        jsonRequest('POST', {
          category_id: expenseCategory?.id,
          title: receipt.analysis?.merchant ?? 'Receipt',
          amount: receipt.analysis?.amount ?? 1,
          spent_at: receipt.analysis?.spent_at ?? '2026-07-24',
          memo: '',
        }),
        cookie,
      );
      expect(confirmation.response.status).toBe(201);
      expect(confirmation.body).toMatchObject({
        data: { status: 'confirmed' },
      });

      const receiptDeletion = await apiRequest(
        `/api/receipts/${receipt.id}`,
        { method: 'DELETE' },
        cookie,
      );
      expect(receiptDeletion.response.status).toBe(204);

      const memberLogout = await apiRequest(
        '/api/logout',
        jsonRequest('POST', {}),
        cookie,
      );
      expect(memberLogout.response.status).toBe(200);
      expect(
        await db.user.findUnique({ where: { id: registeredUserId } }),
      ).not.toBeNull();
      const memberAfterLogout = await apiRequest('/api/me', {}, cookie);
      expect(memberAfterLogout.response.status).toBe(401);

      const memberLogin = await apiRequest(
        '/api/login',
        jsonRequest('POST', {
          email: `integration-${unique}@example.com`,
          password: 'password123',
        }),
      );
      expect(memberLogin.response.status).toBe(200);
      expect(memberLogin.body).toMatchObject({
        data: { user: { id: registeredUserId, is_guest: false } },
      });
      const memberReloginCookie = responseCookie(memberLogin.response);
      const memberAfterRelogin = await apiRequest(
        '/api/me',
        {},
        memberReloginCookie,
      );
      expect(memberAfterRelogin.response.status).toBe(200);
    },
    30_000,
  );
});
