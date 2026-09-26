'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { CircleAlert, CircleCheck, Info, Lightbulb, type LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/auth/AuthContext';
import BrandIllustration from '@/components/BrandIllustration';
import { apiClient, getApiErrorMessage } from '../api/client';
import { formatYen, getCurrentYearMonth } from '../utils/formatters';
import type {
  ApiEnvelope,
  CategoryReport,
  MonthlyReport,
  SpendingInsight,
  SpendingInsightSeverity,
} from '@/types/api';

const insightIcons: Record<SpendingInsightSeverity, LucideIcon> = {
  info: Info,
  warning: CircleAlert,
  positive: CircleCheck,
};

function ReportsPage() {
  const { user } = useAuth();
  const isGuest = user?.is_guest ?? false;
  const current = getCurrentYearMonth();
  const [filters, setFilters] = useState({
    year: current.year,
    month: current.month,
  });
  const [categoryReport, setCategoryReport] = useState<CategoryReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [spendingInsight, setSpendingInsight] = useState<SpendingInsight | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(true);
  const [insightError, setInsightError] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function fetchReports() {
      setError('');
      setIsLoading(true);

      try {
        const [categoryResponse, monthlyResponse] = await Promise.all([
          apiClient.get<ApiEnvelope<CategoryReport>>('/reports/categories', {
            params: {
              year: filters.year,
              month: filters.month,
            },
          }),
          apiClient.get<ApiEnvelope<MonthlyReport>>('/reports/monthly', {
            params: {
              year: filters.year,
            },
          }),
        ]);

        if (isActive) {
          setCategoryReport(categoryResponse.data.data);
          setMonthlyReport(monthlyResponse.data.data);
        }
      } catch (requestError) {
        if (isActive) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    async function fetchSpendingInsight() {
      setSpendingInsight(null);
      setInsightError('');

      if (isGuest) {
        setIsInsightLoading(false);
        return;
      }

      setIsInsightLoading(true);

      try {
        const response = await apiClient.get<ApiEnvelope<SpendingInsight>>('/reports/insights', {
          params: {
            year: filters.year,
            month: filters.month,
          },
        });

        if (isActive) {
          setSpendingInsight(response.data.data);
        }
      } catch {
        if (isActive) {
          setInsightError('AIレポートを取得できませんでした。集計データは引き続き利用できます。');
        }
      } finally {
        if (isActive) {
          setIsInsightLoading(false);
        }
      }
    }

    fetchReports();
    fetchSpendingInsight();

    return () => {
      isActive = false;
    };
  }, [filters, isGuest]);

  function updateFilter(event: ChangeEvent<HTMLInputElement>) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [event.target.name]: Number(event.target.value),
    }));
  }

  const monthlyData =
    monthlyReport?.months.map((month) => ({
      ...month,
      label: `${month.month}月`,
    })) ?? [];

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="illustrated-page-title">
          <BrandIllustration kind="chart" size={80} />
          <div>
            <p className="eyebrow">支出の振り返り</p>
            <h1>レポート</h1>
            <p className="page-description">お金の流れを知って、次の一歩へ。</p>
          </div>
        </div>
        <div className="header-actions">
          <input
            name="year"
            type="number"
            value={filters.year}
            onChange={updateFilter}
            min="2000"
            max="2100"
            aria-label="年"
          />
          <input
            name="month"
            type="number"
            value={filters.month}
            onChange={updateFilter}
            min="1"
            max="12"
            aria-label="月"
          />
        </div>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {isLoading && <p className="muted-text" role="status">支出を集計しています…</p>}
      <div className="summary-grid" aria-busy={isLoading}>
        <article className="metric-card">
          <span>年間支出</span>
          <strong>{isLoading ? '—' : formatYen(monthlyReport?.summary.total_spent)}</strong>
        </article>
        <article className="metric-card">
          <span>通常支出</span>
          <strong>{isLoading ? '—' : formatYen(monthlyReport?.summary.expense_total)}</strong>
        </article>
        <article className="metric-card">
          <span>サブスク</span>
          <strong>{isLoading ? '—' : formatYen(monthlyReport?.summary.subscription_total)}</strong>
        </article>
        <article className="metric-card">
          <span>サブスク比率</span>
          <strong>{isLoading ? '—' : `${monthlyReport?.summary.subscription_rate ?? 0}%`}</strong>
        </article>
      </div>

      <section className="panel ai-report-panel">
        <div className="panel-header ai-report-header">
          <Lightbulb aria-hidden="true" size={20} />
          <h2>今月の気づき</h2>
        </div>
        <p className="muted-text ai-report-source">登録済みの支出と固定費をもとにしています。</p>
        {isGuest && (
          <p className="guest-feature-note">
            AIによる気づきはアカウント利用時に使えます。月別・カテゴリ別の集計はゲストでも確認できます。
          </p>
        )}
        {!isGuest && isInsightLoading && (
          <p className="muted-text" role="status">
            分析中...
          </p>
        )}
        {!isGuest && insightError && (
          <p className="form-error" role="alert">
            {insightError}
          </p>
        )}
        {!isGuest && spendingInsight && (
          <div className="ai-report-content">
            <p className="ai-report-summary">{spendingInsight.summary}</p>
            {spendingInsight.highlights.length > 0 && (
              <div className="ai-highlight-list">
                {spendingInsight.highlights.map((highlight, index) => {
                  const HighlightIcon = insightIcons[highlight.severity];

                  return (
                    <div className={`ai-highlight-row ${highlight.severity}`} key={`${highlight.type}-${index}`}>
                      <HighlightIcon aria-hidden="true" size={19} />
                      <strong>{highlight.title}</strong>
                      <span>{highlight.description}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {spendingInsight.recommendations.length > 0 && (
              <div className="ai-recommendations">
                <strong>今月の見直しポイント</strong>
                <ul>
                  {spendingInsight.recommendations.map((recommendation, index) => (
                    <li key={`${recommendation}-${index}`}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>月別支出</h2>
        </div>
        {isLoading ? (
          <div className="dashboard-loading" aria-hidden="true"><span className="loading-bar" />集計中…</div>
        ) : (
          <div aria-hidden="true">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData}>
                <CartesianGrid stroke="var(--budgetly-line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--budgetly-muted)" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis tickFormatter={(value) => `¥${value / 1000}k`} stroke="var(--budgetly-muted)" axisLine={false} tickLine={false} fontSize={12} width={52} />
                <Tooltip formatter={(value) => formatYen(value as number)} contentStyle={{ borderRadius: 12, borderColor: 'var(--budgetly-line)', color: 'var(--budgetly-ink)' }} cursor={{ fill: 'var(--budgetly-accent-soft)' }} />
                <Bar dataKey="expense_total" name="通常支出" fill="var(--budgetly-chart-primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="subscription_total" name="サブスク" fill="var(--budgetly-chart-secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {monthlyData.length > 0 && (
          <table className="sr-only">
            <caption>{filters.year}年の月別支出</caption>
            <thead>
              <tr>
                <th scope="col">月</th>
                <th scope="col">通常支出</th>
                <th scope="col">固定費</th>
                <th scope="col">合計</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((item) => (
                <tr key={item.month}>
                  <th scope="row">{item.label}</th>
                  <td>{formatYen(item.expense_total)}</td>
                  <td>{formatYen(item.subscription_total)}</td>
                  <td>{formatYen(item.total_spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>カテゴリ別分析</h2>
        </div>
        <div className="data-table category-data-table">
          {(categoryReport?.categories ?? []).map((category) => (
            <div className="table-row" key={category.category_id}>
              <span className="color-dot" style={{ backgroundColor: category.color }} />
              <strong>{category.name}</strong>
              <span>{category.percentage}%</span>
              <strong>{formatYen(category.amount)}</strong>
            </div>
          ))}
          {isLoading && <p className="muted-text">カテゴリを集計しています…</p>}
          {!isLoading && (categoryReport?.categories ?? []).length === 0 && (
            <div className="empty-state">
              <BrandIllustration kind="chart" size={88} />
              <p>この月の支出はまだありません。ホームで記録すると、ここで振り返れます。</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

export default ReportsPage;
