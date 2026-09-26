'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { apiClient, getApiErrorMessage } from '../api/client';
import RecentExpenseList from '@/components/RecentExpenseList';
import ExpenseEntryDialog from '@/components/ExpenseEntryDialog';
import BrandIllustration from '@/components/BrandIllustration';
import { formatDateValue, formatYen, getCurrentYearMonth } from '../utils/formatters';
import type {
  ApiEnvelope,
  BudgetStatus,
  Category,
  CategoryReport,
  DashboardSummary,
  Expense,
  ExpensePayload,
  SubscriptionPayload,
} from '@/types/api';

const statusLabels: Record<BudgetStatus, string> = {
  safe: '予定どおり',
  warning: 'ペースに注意',
  over_budget: '予算を超過',
};

const statusMessages: Record<BudgetStatus, string> = {
  safe: 'このペースなら、今月も予算内で過ごせそうです。',
  warning: '残りの日数を意識して、少しペースを整えましょう。',
  over_budget: '大きな支出を確認して、来月の予算づくりに活かしましょう。',
};

function DashboardPage() {
  const current = getCurrentYearMonth();
  const [filters, setFilters] = useState(current);
  const [entryDate, setEntryDate] = useState(() => formatDateValue());
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [categoryReport, setCategoryReport] = useState<CategoryReport | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(
    async (shouldUpdate: () => boolean = () => true) => {
      try {
        setIsLoading(true);
        setError('');

        const params = {
          year: filters.year,
          month: filters.month,
        };
        const [dashboardResponse, categoryResponse, categoriesResponse, expensesResponse] = await Promise.all([
          apiClient.get<ApiEnvelope<DashboardSummary>>('/dashboard', { params }),
          apiClient.get<ApiEnvelope<CategoryReport>>('/reports/categories', { params }),
          apiClient.get<ApiEnvelope<Category[]>>('/categories', { params: { type: 'expense' } }),
          apiClient.get<ApiEnvelope<Expense[]>>('/expenses', { params }),
        ]);

        if (shouldUpdate()) {
          setDashboard(dashboardResponse.data.data);
          setCategoryReport(categoryResponse.data.data);
          setExpenseCategories(categoriesResponse.data.data);
          setExpenses(expensesResponse.data.data);
        }
      } catch (requestError) {
        if (shouldUpdate()) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (shouldUpdate()) {
          setIsLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    let isActive = true;

    fetchDashboard(() => isActive);

    return () => {
      isActive = false;
    };
  }, [fetchDashboard]);

  function updateFilter(event: ChangeEvent<HTMLSelectElement>) {
    const nextValue = Number(event.target.value);

    setFilters((currentFilters) => ({
      ...currentFilters,
      [event.target.name]: nextValue,
    }));

    setEntryDate((currentDate) => {
      const [year, month, day] = currentDate.split('-').map(Number);
      const nextYear = event.target.name === 'year' ? nextValue : year;
      const nextMonth = event.target.name === 'month' ? nextValue : month;
      const lastDate = new Date(nextYear, nextMonth, 0).getDate();
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, lastDate)).padStart(2, '0')}`;
    });
  }

  async function createExpense(payload: ExpensePayload) {
    setError('');

    try {
      await apiClient.post('/expenses', payload);
      await refreshForDate(payload.spent_at);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      throw requestError;
    }
  }

  async function createRecurringExpense(payload: SubscriptionPayload) {
    setError('');

    try {
      await apiClient.post('/subscriptions', payload);
      await refreshForDate(payload.started_at);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      throw requestError;
    }
  }

  async function updateExpense(expenseId: number, payload: ExpensePayload) {
    setError('');

    try {
      await apiClient.put(`/expenses/${expenseId}`, payload);
      setEditingExpense(null);
      await refreshForDate(payload.spent_at);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      throw requestError;
    }
  }

  async function deleteExpense(expenseId: number) {
    await apiClient.delete(`/expenses/${expenseId}`);
    await fetchDashboard();
  }

  async function refreshForDate(spentAt: string) {
    const [year, month] = spentAt.split('-').map(Number);
    setEntryDate(spentAt);

    if (year === filters.year && month === filters.month) {
      await fetchDashboard();
      return;
    }

    setFilters({ year, month });
  }

  function openExpenseEntry() {
    setEditingExpense(null);
    setIsEntryOpen(true);
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpense(expense);
    setIsEntryOpen(true);
  }

  const reportCategories = categoryReport?.categories ?? [];
  const categoryTotal = reportCategories.reduce((total, category) => total + Number(category.amount), 0);
  const status = dashboard?.status ?? 'safe';
  const usageRate = dashboard ? Math.max(0, Math.min(dashboard.usage_rate, 100)) : 0;
  const remainingLabel = dashboard && dashboard.remaining < 0 ? '予算を超えた金額' : '今月、あと使えるお金';
  const remainingAmount = dashboard ? Math.abs(dashboard.remaining) : 0;
  const needsBudget = dashboard?.budget === 0 && dashboard.total_spent === 0;

  return (
    <section className="page-stack dashboard-page">
      <header className="page-header dashboard-page-header">
        <div>
          <p className="eyebrow">くらしのお金</p>
          <h1>{filters.month}月の家計</h1>
          <p className="page-description">小さな記録から、心地よい毎日へ。</p>
        </div>
        <div className="header-actions dashboard-month-picker" aria-label="表示する年月">
          <select name="year" value={filters.year} onChange={updateFilter} aria-label="年">
            {Array.from({ length: 5 }, (_, index) => current.year - 2 + index).map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <select name="month" value={filters.month} onChange={updateFilter} aria-label="月">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {month}月
              </option>
            ))}
          </select>
        </div>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {isLoading && !dashboard && (
        <div className="dashboard-loading" role="status" aria-live="polite">
          <span className="loading-bar" />
          <span>家計の状況を読み込んでいます…</span>
        </div>
      )}
      {isLoading && dashboard && (
        <p className="dashboard-refresh-status" role="status">
          最新の内容に更新しています…
        </p>
      )}

      {dashboard && (
        <>
          <section className={`dashboard-overview ${status}`} aria-labelledby="dashboard-overview-title">
            <div className="dashboard-overview-top">
              <div className="dashboard-overview-copy">
                <h2 id="dashboard-overview-title">{remainingLabel}</h2>
                <div className="dashboard-balance-actions">
                  <strong className="dashboard-balance">{formatYen(remainingAmount)}</strong>
                  {needsBudget ? (
                    <Link href="/budgets" className="overview-primary-action">今月の予算を設定</Link>
                  ) : (
                    <button type="button" className="overview-primary-action" onClick={openExpenseEntry}>
                      <Plus size={19} aria-hidden="true" />支出を記録
                    </button>
                  )}
                </div>
                <p className="dashboard-overview-message">
                  <span className={`status-pill ${status === 'over_budget' ? 'danger' : status}`}>
                    {needsBudget ? 'はじめの一歩' : statusLabels[status]}
                  </span>
                  {needsBudget ? '今月の予算を決めて、記録をはじめましょう。' : statusMessages[status]}
                </p>
              </div>
              <div className="dashboard-companion">
                <BrandIllustration size={176} priority />
                <span>少しずつ、ゆとりを。</span>
              </div>
            </div>

            <div className="budget-progress">
              <div className="budget-progress-label">
                <span>予算の使用率</span>
                <strong>{dashboard.usage_rate}%</strong>
              </div>
              <div
                className="budget-progress-track"
                role="progressbar"
                aria-label="予算の使用率"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={usageRate}
                aria-valuetext={`${dashboard.usage_rate}%`}
              >
                <span style={{ width: `${usageRate}%` }} />
              </div>
            </div>

            <dl className="dashboard-overview-metrics">
              <div>
                <dt>1日の目安</dt>
                <dd>{formatYen(dashboard.daily_available_amount)}</dd>
              </div>
              <div>
                <dt>月間予算</dt>
                <dd>{formatYen(dashboard.budget)}</dd>
              </div>
              <div>
                <dt>利用済み</dt>
                <dd>{formatYen(dashboard.total_spent)}</dd>
              </div>
            </dl>
          </section>

          <div className="dashboard-detail-grid">
            <RecentExpenseList
              key={`${filters.year}-${filters.month}`}
              expenses={expenses}
              onCreate={openExpenseEntry}
              onEdit={startEditingExpense}
              onDelete={deleteExpense}
            />
            <section className="panel category-overview-panel">
              <div className="panel-header split">
                <h2>支出の内訳</h2>
                <Link href="/reports" className="text-link">
                  詳しく見る
                </Link>
              </div>
              {reportCategories.length > 0 ? (
                <div className="category-breakdown">
                  <div className="category-donut">
                    <div aria-hidden="true">
                      <ResponsiveContainer width="100%" height={224}>
                        <PieChart accessibilityLayer={false}>
                          <Pie data={reportCategories} dataKey="amount" nameKey="name" innerRadius={72} outerRadius={102} paddingAngle={2} stroke="none" isAnimationActive={false}>
                            {reportCategories.map((entry, index) => (
                              <Cell key={entry.category_id} fill={`var(--budgetly-category-${index % 6})`} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="category-donut-total"><span>通常支出</span><strong>{formatYen(categoryTotal)}</strong></div>
                  </div>
                  <ul className="legend-list">
                    {reportCategories.map((item, index) => (
                      <li key={item.category_id}>
                        <span style={{ backgroundColor: `var(--budgetly-category-${index % 6})` }} aria-hidden="true" />
                        <span>{item.name}</span>
                        <strong>{formatYen(item.amount)}</strong>
                        <small>{item.percentage}%</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="empty-state">
                  <BrandIllustration kind="chart" size={88} />
                  <p>この月の支出はまだありません。</p>
                  <button type="button" className="secondary-button" onClick={openExpenseEntry}>
                    最初の支出を追加
                  </button>
                </div>
              )}
              <Link href="/subscriptions" className="fixed-cost-summary">
                <span>毎月の固定費</span><strong>{formatYen(dashboard.subscription_total)}</strong><span aria-hidden="true">→</span>
              </Link>
            </section>
          </div>

        </>
      )}
      {dashboard && (
        <ExpenseEntryDialog
          isOpen={isEntryOpen}
          categories={expenseCategories}
          selectedDate={entryDate}
          onSelectDate={setEntryDate}
          onCreate={createExpense}
          onCreateRecurring={createRecurringExpense}
          onUpdate={updateExpense}
          onReceiptConfirmed={refreshForDate}
          editingExpense={editingExpense}
          onClearEditing={() => setEditingExpense(null)}
          onClose={() => { setIsEntryOpen(false); setEditingExpense(null); }}
        />
      )}
    </section>
  );
}

export default DashboardPage;
