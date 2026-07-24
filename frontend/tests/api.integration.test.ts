import { describe, expect, it } from 'vitest';

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
      const unauthenticated = await apiRequest('/api/me');
      expect(unauthenticated.response.status).toBe(401);

      const registration = await apiRequest(
        '/api/register',
        jsonRequest('POST', {
          name: 'Integration User',
          email: `integration-${unique}@example.com`,
          password: 'password123',
          password_confirmation: 'password123',
        }),
      );
      expect(registration.response.status).toBe(201);
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
        jsonRequest('POST', {
          name: 'Other User',
          email: `other-${unique}@example.com`,
          password: 'password123',
          password_confirmation: 'password123',
        }),
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
    },
    30_000,
  );
});
