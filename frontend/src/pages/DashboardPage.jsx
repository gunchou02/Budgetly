import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { apiClient, getApiErrorMessage } from '../api/client';
import { formatMonthLabel, formatYen, getCurrentYearMonth } from '../utils/formatters';

const statusLabels = {
  safe: '余裕あり',
  warning: '注意',
  over_budget: '予算オーバー',
};

function DashboardPage() {
  const current = getCurrentYearMonth();
  const [filters, setFilters] = useState(current);
  const [dashboard, setDashboard] = useState(null);
  const [categoryReport, setCategoryReport] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function fetchDashboard() {
      setIsLoading(true);
      setError('');

      try {
        const params = {
          year: filters.year,
          month: filters.month,
        };
        const [dashboardResponse, categoryResponse, subscriptionResponse] = await Promise.all([
          apiClient.get('/dashboard', { params }),
          apiClient.get('/reports/categories', { params }),
          apiClient.get('/subscriptions', { params: { status: 'active' } }),
        ]);

        if (isActive) {
          setDashboard(dashboardResponse.data.data);
          setCategoryReport(categoryResponse.data.data);
          setSubscriptions(subscriptionResponse.data.data);
        }
      } catch (requestError) {
        if (isActive) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isActive = false;
    };
  }, [filters]);

  function updateFilter(event) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [event.target.name]: Number(event.target.value),
    }));
  }

  const categories = categoryReport?.categories ?? [];
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

          <div className="content-grid">
            <section className="panel">
              <div className="panel-header">
                <h2>カテゴリ別支出</h2>
              </div>
              {categories.length > 0 ? (
                <div className="chart-layout">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={categories} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={96}>
                        {categories.map((entry) => (
                          <Cell key={entry.category_id} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="legend-list">
                    {categories.map((item) => (
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

            <section className="panel">
              <div className="panel-header">
                <h2>サブスク</h2>
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
                使用率 {dashboard.usage_rate}% / サブスク合計 {formatYen(dashboard.subscription_total)}
              </p>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

export default DashboardPage;
