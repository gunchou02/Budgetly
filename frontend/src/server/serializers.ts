import { formatDate } from '@/server/dates';

interface CategoryRecord {
  color: string;
  icon: string | null;
  id: number;
  name: string;
  type: string;
}

export function serializeCategory(category: CategoryRecord) {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    type: category.type,
  };
}

export function serializeBudget(budget: {
  amount: number;
  id: number;
  month: number;
  year: number;
}) {
  return {
    id: budget.id,
    year: budget.year,
    month: budget.month,
    amount: budget.amount,
  };
}

export function serializeExpense(expense: {
  amount: number;
  category?: CategoryRecord | null;
  categoryId: number;
  id: number;
  memo: string | null;
  spentAt: Date;
  title: string;
}) {
  return {
    id: expense.id,
    category_id: expense.categoryId,
    title: expense.title,
    amount: expense.amount,
    spent_at: formatDate(expense.spentAt),
    memo: expense.memo,
    ...(expense.category !== undefined
      ? {
          category: expense.category
            ? serializeCategory(expense.category)
            : null,
        }
      : {}),
  };
}

export function serializeSubscription(subscription: {
  amount: number;
  billingCycle: string;
  billingDay: number;
  canceledAt: Date | null;
  category?: CategoryRecord | null;
  categoryId: number;
  id: number;
  memo: string | null;
  name: string;
  startedAt: Date;
}) {
  return {
    id: subscription.id,
    category_id: subscription.categoryId,
    name: subscription.name,
    amount: subscription.amount,
    billing_day: subscription.billingDay,
    billing_cycle: subscription.billingCycle,
    started_at: formatDate(subscription.startedAt),
    canceled_at: subscription.canceledAt
      ? formatDate(subscription.canceledAt)
      : null,
    memo: subscription.memo,
    ...(subscription.category !== undefined
      ? {
          category: subscription.category
            ? serializeCategory(subscription.category)
            : null,
        }
      : {}),
  };
}

interface ReceiptAnalysisRecord {
  amount: number | null;
  confidence: unknown;
  extractedText: string;
  id: number;
  merchant: string | null;
  provider: string;
  receiptId: number;
  spentAt: Date | null;
  suggestedCategory?: CategoryRecord | null;
  suggestedCategoryId: number | null;
}

export function serializeReceiptAnalysis(
  analysis: ReceiptAnalysisRecord,
) {
  return {
    id: analysis.id,
    receipt_id: analysis.receiptId,
    suggested_category_id: analysis.suggestedCategoryId,
    provider: analysis.provider,
    merchant: analysis.merchant,
    spent_at: analysis.spentAt ? formatDate(analysis.spentAt) : null,
    amount: analysis.amount,
    confidence: analysis.confidence,
    extracted_text: analysis.extractedText,
    ...(analysis.suggestedCategory !== undefined
      ? {
          suggested_category: analysis.suggestedCategory
            ? serializeCategory(analysis.suggestedCategory)
            : null,
        }
      : {}),
  };
}

export function serializeReceipt(receipt: {
  analysis?: ReceiptAnalysisRecord | null;
  analyzedAt: Date | null;
  confirmedAt: Date | null;
  expense?: Parameters<typeof serializeExpense>[0] | null;
  expenseId: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  fileSize: number;
  id: number;
  jobId: string;
  mimeType: string;
  originalName: string;
  processingStartedAt: Date | null;
  status: string;
}) {
  return {
    id: receipt.id,
    expense_id: receipt.expenseId,
    job_id: receipt.jobId,
    status: receipt.status,
    original_name: receipt.originalName,
    mime_type: receipt.mimeType,
    file_size: receipt.fileSize,
    failure_code: receipt.failureCode,
    failure_message: receipt.failureMessage,
    processing_started_at:
      receipt.processingStartedAt?.toISOString() ?? null,
    analyzed_at: receipt.analyzedAt?.toISOString() ?? null,
    confirmed_at: receipt.confirmedAt?.toISOString() ?? null,
    ...(receipt.analysis !== undefined
      ? {
          analysis: receipt.analysis
            ? serializeReceiptAnalysis(receipt.analysis)
            : null,
        }
      : {}),
    ...(receipt.expense !== undefined
      ? {
          expense: receipt.expense
            ? serializeExpense(receipt.expense)
            : null,
        }
      : {}),
  };
}
