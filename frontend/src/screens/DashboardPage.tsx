'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { apiClient, getApiErrorMessage } from '../api/client';
import DailyExpenseList from '../components/DailyExpenseList';
import ExpenseCalendar from '../components/ExpenseCalendar';
import QuickExpensePanel from '../components/QuickExpensePanel';
import { formatDateValue, formatMonthLabel, formatYen, getCurrentYearMonth } from '../utils/formatters';
import type {
  ApiEnvelope,
  BudgetStatus,
  Category,
  CategoryReport,
  DashboardSummary,
  Expense,
  ExpensePayload,
  Subscription,
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
  const [selectedDate, setSelectedDate] = useState(() => formatDateValue());
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [categoryReport, setCategoryReport] = useState<CategoryReport | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isQuickEntryExpanded, setIsQuickEntryExpanded] = useState(false);
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
        const [dashboardResponse, categoryResponse, categoriesResponse, expensesResponse, subscriptionResponse] = await Promise.all([
          apiClient.get<ApiEnvelope<DashboardSummary>>('/dashboard', { params }),
          apiClient.get<ApiEnvelope<CategoryReport>>('/reports/categories', { params }),
          apiClient.get<ApiEnvelope<Category[]>>('/categories', { params: { type: 'expense' } }),
          apiClient.get<ApiEnvelope<Expense[]>>('/expenses', { params }),
          apiClient.get<ApiEnvelope<Subscription[]>>('/subscriptions', { params: { status: 'active' } }),
        ]);

        if (shouldUpdate()) {
          setDashboard(dashboardResponse.data.data);
          setCategoryReport(categoryResponse.data.data);
          setExpenseCategories(categoriesResponse.data.data);
          setExpenses(expensesResponse.data.data);
          setSubscriptions(subscriptionResponse.data.data);
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

    setSelectedDate((currentDate) => {
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
      await fetchDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      throw requestError;
    }
  }

  async function createRecurringExpense(payload: SubscriptionPayload) {
    setError('');

    try {
      await apiClient.post('/subscriptions', payload);
      await fetchDashboard();
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
      await fetchDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      throw requestError;
    }
  }

  async function deleteExpense(expenseId: number) {
    setError('');

    try {
      await apiClient.delete(`/expenses/${expenseId}`);
      await fetchDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  async function handleReceiptConfirmed(spentAt: string) {
    const [year, month] = spentAt.split('-').map(Number);
    setSelectedDate(spentAt);

    if (year === filters.year && month === filters.month) {
      await fetchDashboard();
      return;
    }

    setFilters({ year, month });
  }

  function revealQuickEntry() {
    setIsQuickEntryExpanded(true);

    requestAnimationFrame(() => {
      const expenseEntry = document.getElementById('expense-entry');
      expenseEntry?.scrollIntoView({ block: 'start' });
    });
  }

  function startEditingExpense(expense: Expense) {
    setEditingExpense(expense);
    revealQuickEntry();
  }

  const reportCategories = categoryReport?.categories ?? [];
  const quickExpenseCategories = expenseCategories;
  const status = dashboard?.status ?? 'safe';
  const usageRate = dashboard ? Math.max(0, Math.min(dashboard.usage_rate, 100)) : 0;
  const remainingLabel = dashboard && dashboard.remaining < 0 ? '予算を超えた金額' : '今月、あと使えるお金';
  const remainingAmount = dashboard ? Math.abs(dashboard.remaining) : 0;

  return (
    <section className="page-stack dashboard-page">
      <header className="page-header dashboard-page-header">
        <div>
          <p className="eyebrow">くらしのお金</p>
          <h1>{filters.month}月の家計</h1>
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
              <div>
                <p className="dashboard-overview-period">{formatMonthLabel(filters.year, filters.month)}</p>
                <h2 id="dashboard-overview-title">{remainingLabel}</h2>
                <div className="dashboard-balance-line">
                  <strong>{formatYen(remainingAmount)}</strong>
                  <span className={`status-pill ${status === 'over_budget' ? 'danger' : status}`}>
                    {statusLabels[status]}
                  </span>
                </div>
                <p className="dashboard-overview-message">{statusMessages[status]}</p>
              </div>
              <button type="button" className="overview-primary-action" onClick={revealQuickEntry}>
                <Plus size={19} aria-hidden="true" />
                支出を記録
              </button>
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

          <div className="dashboard-calendar-grid">
            <div className="calendar-column">
              <ExpenseCalendar
                year={filters.year}
                month={filters.month}
                expenses={expenses}
                subscriptions={subscriptions}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              <DailyExpenseList
                expenses={expenses}
                subscriptions={subscriptions}
                selectedDate={selectedDate}
                onEdit={startEditingExpense}
                onDelete={deleteExpense}
              />
            </div>
            <QuickExpensePanel
              categories={quickExpenseCategories}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onCreate={createExpense}
              onCreateRecurring={createRecurringExpense}
              onUpdate={updateExpense}
              onReceiptConfirmed={handleReceiptConfirmed}
              editingExpense={editingExpense}
              onClearEditing={() => setEditingExpense(null)}
              mobileExpanded={isQuickEntryExpanded}
              onMobileExpandedChange={setIsQuickEntryExpanded}
            />
            <section className="panel fixed-cost-panel">
              <div className="panel-header split">
                <h2>これからの固定費</h2>
                <Link href="/subscriptions" className="text-link">
                  管理する
                </Link>
              </div>
              {subscriptions.length > 0 ? (
                <div className="subscription-list">
                  {subscriptions.slice(0, 5).map((subscription) => (
                    <div key={subscription.id}>
                      <span>{subscription.name}</span>
                      <strong>{formatYen(subscription.amount)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">登録済みの固定費はありません。</p>
              )}
              <p className={`insight ${dashboard.remaining < 0 ? 'danger-text' : ''}`}>
                固定費合計 {formatYen(dashboard.subscription_total)}
              </p>
            </section>
          </div>

          <div className="content-grid">
            <section className="panel category-overview-panel">
              <div className="panel-header split">
                <h2>カテゴリ別支出</h2>
                <Link href="/reports" className="text-link">
                  詳しく見る
                </Link>
              </div>
              {reportCategories.length > 0 ? (
                <div className="chart-layout">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={reportCategories} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={96}>
                        {reportCategories.map((entry) => (
                          <Cell key={entry.category_id} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="legend-list">
                    {reportCategories.map((item) => (
                      <li key={item.category_id}>
                        <span style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                        <strong>{formatYen(item.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="empty-state">
                  <p>この月の支出はまだありません。</p>
                  <button type="button" className="secondary-button" onClick={revealQuickEntry}>
                    最初の支出を追加
                  </button>
                </div>
              )}
            </section>
          </div>

        </>
      )}
    </section>
  );
}

export default DashboardPage;
