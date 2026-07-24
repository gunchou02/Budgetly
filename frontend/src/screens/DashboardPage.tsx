'use client';

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
  safe: '余裕あり',
  warning: '注意',
  over_budget: '予算オーバー',
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
    }
  }

  async function createRecurringExpense(payload: SubscriptionPayload) {
    setError('');

    try {
      await apiClient.post('/subscriptions', payload);
      await fetchDashboard();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
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

  const reportCategories = categoryReport?.categories ?? [];
  const quickExpenseCategories = expenseCategories;
  const status = dashboard?.status ?? 'safe';

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatMonthLabel(filters.year, filters.month)}</p>
          <h1>今月の生活費</h1>
        </div>
        <div className="header-actions">
          <select name="year" value={filters.year} onChange={updateFilter}>
            {Array.from({ length: 5 }, (_, index) => current.year - 2 + index).map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
          <select name="month" value={filters.month} onChange={updateFilter}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {month}月
              </option>
            ))}
          </select>
          <span className={`status-pill ${status === 'over_budget' ? 'danger' : status}`}>
            {statusLabels[status]}
          </span>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {isLoading && <p className="muted-text">読み込み中...</p>}

      {dashboard && (
        <>
          <div className="summary-grid">
            <article className="metric-card">
              <span>月間予算</span>
              <strong>{formatYen(dashboard.budget)}</strong>
            </article>
            <article className="metric-card">
              <span>利用済み</span>
              <strong>{formatYen(dashboard.total_spent)}</strong>
            </article>
            <article className={`metric-card emphasis ${dashboard.remaining >= 0 ? 'positive' : ''}`}>
              <span>今月の残り</span>
              <strong>{formatYen(dashboard.remaining)}</strong>
            </article>
            <article className="metric-card">
              <span>1日あたり</span>
              <strong>{formatYen(dashboard.daily_available_amount)}</strong>
            </article>
          </div>

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
                onEdit={setEditingExpense}
                onDelete={deleteExpense}
              />
            </div>
            <div className="dashboard-side-column">
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
              />
              <section className="panel fixed-cost-panel">
                <div className="panel-header">
                  <h2>固定費</h2>
                </div>
                <div className="subscription-list">
                  {subscriptions.slice(0, 5).map((subscription) => (
                    <div key={subscription.id}>
                      <span>{subscription.name}</span>
                      <strong>{formatYen(subscription.amount)}</strong>
                    </div>
                  ))}
                </div>
                <p className={`insight ${dashboard.remaining < 0 ? 'danger-text' : ''}`}>
                  使用率 {dashboard.usage_rate}% / 固定費合計 {formatYen(dashboard.subscription_total)}
                </p>
              </section>
            </div>
          </div>

          <div className="content-grid">
            <section className="panel">
              <div className="panel-header">
                <h2>カテゴリ別支出</h2>
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
                <p className="muted-text">この月の支出はまだありません。</p>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}

export default DashboardPage;
