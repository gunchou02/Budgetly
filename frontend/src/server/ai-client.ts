import { z } from 'zod';
import { requiredEnv } from '@/server/config';
import { ApiError } from '@/server/http';

const receiptAnalysisSchema = z.object({
  provider: z.string().min(1).max(100),
  merchant: z.string().max(255).nullable(),
  spent_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  amount: z.number().int().positive().nullable(),
  suggested_category_id: z.number().int().positive().nullable(),
  confidence: z.object({
    merchant: z.number().min(0).max(1),
    spent_at: z.number().min(0).max(1),
    amount: z.number().min(0).max(1),
    category: z.number().min(0).max(1),
    overall: z.number().min(0).max(1),
  }),
  extracted_text: z.string().max(16_000),
});

const spendingInsightSchema = z.object({
  provider: z.string().min(1).max(100),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  summary: z.string().min(1).max(1000),
  highlights: z
    .array(
      z.object({
        type: z.enum([
          'top_category',
          'budget',
          'month_over_month',
          'subscription',
        ]),
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(1000),
        severity: z.enum(['info', 'warning', 'positive']),
      }),
    )
    .max(8),
  recommendations: z.array(z.string().min(1).max(500)).max(8),
});

export interface SpendingInsightPayload {
  period: string;
  currency: 'JPY';
  budget_amount: number;
  total_spent: number;
  remaining_amount: number;
  usage_rate: number;
  previous_month_total: number;
  month_over_month_rate: number | null;
  subscription_total: number;
  subscription_rate: number;
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
    month_over_month_rate: number | null;
  }>;
}

export interface ReceiptAnalysisPayload {
  job_id: string;
  image_key: string;
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
  language: 'ja';
  category_candidates: Array<{ id: number; name: string }>;
}

export class ReceiptAnalysisFailure extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type ReceiptAnalysisResult = z.infer<typeof receiptAnalysisSchema>;

function aiServiceUrl(path: string): string {
  return `${requiredEnv('AI_SERVICE_URL').replace(/\/+$/, '')}${path}`;
}

function aiServiceHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Internal-Token': requiredEnv('AI_INTERNAL_API_TOKEN'),
  };
}

async function requestReceiptAnalysis(
  path: string,
  init: RequestInit,
): Promise<ReceiptAnalysisResult> {
  let response: Response;

  try {
    response = await fetch(aiServiceUrl(path), {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ReceiptAnalysisFailure(
      'ai_unavailable',
      'The receipt analysis service is temporarily unavailable.',
    );
  }

  if (!response.ok) {
    throw new ReceiptAnalysisFailure(
      'ai_request_failed',
      'The receipt analysis service could not process the image.',
    );
  }

  try {
    return receiptAnalysisSchema.parse(await response.json());
  } catch {
    throw new ReceiptAnalysisFailure(
      'invalid_ai_response',
      'The receipt analysis service returned an invalid response.',
    );
  }
}

export async function analyzeSpendingReport(
  payload: SpendingInsightPayload,
): Promise<z.infer<typeof spendingInsightSchema>> {
  let response: Response;

  try {
    response = await fetch(aiServiceUrl('/v1/reports/analyze'), {
      method: 'POST',
      headers: aiServiceHeaders(),
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(
      503,
      'AIレポートを現在生成できません。しばらくしてから再試行してください。',
      undefined,
      'ai_unavailable',
    );
  }

  if (!response.ok) {
    throw new ApiError(
      503,
      'AIレポートを現在生成できません。しばらくしてから再試行してください。',
      undefined,
      'ai_request_failed',
    );
  }

  try {
    const insight = spendingInsightSchema.parse(await response.json());

    if (insight.period !== payload.period) {
      throw new Error('Unexpected report period.');
    }

    return insight;
  } catch {
    throw new ApiError(
      503,
      'AIレポートを現在生成できません。しばらくしてから再試行してください。',
      undefined,
      'invalid_ai_response',
    );
  }
}

export async function analyzeReceipt(input: {
  image: Buffer;
  originalName: string;
  payload: ReceiptAnalysisPayload;
}): Promise<ReceiptAnalysisResult> {
  const form = new FormData();
  const imageBytes = Uint8Array.from(input.image);

  form.append(
    'image',
    new Blob([imageBytes], { type: input.payload.mime_type }),
    input.originalName,
  );
  form.append('payload', JSON.stringify(input.payload));

  return requestReceiptAnalysis('/v1/receipts/analyze', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-Internal-Token': requiredEnv('AI_INTERNAL_API_TOKEN'),
      'X-Request-ID': input.payload.job_id,
    },
    body: form,
  });
}

export async function analyzeBlobReceipt(
  payload: ReceiptAnalysisPayload,
): Promise<ReceiptAnalysisResult> {
  return requestReceiptAnalysis('/v1/receipts/analyze-blob', {
    method: 'POST',
    headers: {
      ...aiServiceHeaders(),
      'X-Request-ID': payload.job_id,
    },
    body: JSON.stringify(payload),
  });
}
