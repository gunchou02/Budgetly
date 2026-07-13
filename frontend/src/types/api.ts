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

export interface AuthResponse {
  token: string;
  user: User;
}
