export interface ApiEnvelope<T> {
  data: T;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export type CategoryType = 'expense' | 'fixed';

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  type: CategoryType;
}

export interface Expense {
  id: number;
  category_id: number;
  title: string;
  amount: number;
  spent_at: string;
  memo: string | null;
  category?: Category | null;
}

export interface ExpensePayload {
  category_id: number;
  title: string;
  amount: number;
  spent_at: string;
  memo: string;
}

export type ReceiptStatus = 'queued' | 'processing' | 'review_required' | 'confirmed' | 'failed';

export interface ReceiptConfidence {
  merchant: number;
  spent_at: number;
  amount: number;
  category: number;
  overall: number;
}

export interface ReceiptAnalysis {
  id: number;
  receipt_id: number;
  suggested_category_id: number | null;
  provider: string;
  merchant: string | null;
  spent_at: string | null;
  amount: number | null;
  confidence: ReceiptConfidence;
  extracted_text: string;
  suggested_category?: Category | null;
}

export interface Receipt {
  id: number;
  expense_id: number | null;
  job_id: string;
  status: ReceiptStatus;
  original_name: string;
  mime_type: string;
  file_size: number;
  failure_code: string | null;
  failure_message: string | null;
  processing_started_at: string | null;
  analyzed_at: string | null;
  confirmed_at: string | null;
  analysis?: ReceiptAnalysis | null;
  expense?: Expense | null;
}

export interface ReceiptConfirmationPayload {
  category_id: number;
  title: string;
  amount: number;
  spent_at: string;
  memo: string;
}

export interface Subscription {
  id: number;
  category_id: number;
  name: string;
  amount: number;
  billing_day: number;
  billing_cycle: 'monthly';
  started_at: string;
  canceled_at: string | null;
  memo: string | null;
  category?: Category | null;
}

export interface SubscriptionPayload {
  category_id: number;
  name: string;
  amount: number;
  billing_day: number;
  billing_cycle: 'monthly';
  started_at: string;
  memo: string;
}

export interface MonthlyBudget {
  id: number;
  year: number;
  month: number;
  amount: number;
}

export type BudgetStatus = 'safe' | 'warning' | 'over_budget';

export interface DashboardSummary {
  budget: number;
  expense_total: number;
  subscription_total: number;
  total_spent: number;
  remaining: number;
  usage_rate: number;
  daily_available_amount: number;
  status: BudgetStatus;
}

export interface CategoryReportItem {
  category_id: number;
  name: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface CategoryReport {
  categories: CategoryReportItem[];
}

export interface MonthlyReportItem {
  month: number;
  expense_total: number;
  subscription_total: number;
  total_spent: number;
}

export interface MonthlyReport {
  summary: {
    total_spent: number;
    expense_total: number;
    subscription_total: number;
    subscription_rate: number;
  };
  months: MonthlyReportItem[];
}

export type SpendingInsightSeverity = 'info' | 'warning' | 'positive';

export interface SpendingInsightHighlight {
  type: 'top_category' | 'budget' | 'month_over_month' | 'subscription';
  title: string;
  description: string;
  severity: SpendingInsightSeverity;
}

export interface SpendingInsight {
  provider: string;
  period: string;
  summary: string;
  highlights: SpendingInsightHighlight[];
  recommendations: string[];
}

export interface AuthResponse {
  user: User;
}
