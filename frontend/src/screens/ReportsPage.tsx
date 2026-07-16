'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { CircleAlert, CircleCheck, Info, Sparkles, type LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

  useEffect(() => {
    let isActive = true;

    async function fetchReports() {
      setError('');

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
      }
    }

    async function fetchSpendingInsight() {
      setSpendingInsight(null);
      setInsightError('');
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
  }, [filters]);

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
        <div>
          <p className="eyebrow">Reports</p>
          <h1>レポート</h1>
        </div>
        <div className="header-actions">
          <input name="year" type="number" value={filters.year} onChange={updateFilter} min="2000" max="2100" />
          <input name="month" type="number" value={filters.month} onChange={updateFilter} min="1" max="12" />
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <div className="summary-grid">
        <article className="metric-card">
          <span>年間支出</span>
          <strong>{formatYen(monthlyReport?.summary.total_spent)}</strong>
        </article>
        <article className="metric-card">
          <span>通常支出</span>
          <strong>{formatYen(monthlyReport?.summary.expense_total)}</strong>
        </article>
        <article className="metric-card">
          <span>サブスク</span>
          <strong>{formatYen(monthlyReport?.summary.subscription_total)}</strong>
        </article>
        <article className="metric-card">
          <span>サブスク比率</span>
          <strong>{monthlyReport?.summary.subscription_rate ?? 0}%</strong>
        </article>
      </div>

      <section className="panel ai-report-panel">
        <div className="panel-header ai-report-header">
          <Sparkles aria-hidden="true" size={20} />
          <h2>AI支出レポート</h2>
        </div>
        {isInsightLoading && <p className="muted-text">分析中...</p>}
        {insightError && <p className="form-error">{insightError}</p>}
        {spendingInsight && (
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
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(value) => `¥${value / 1000}k`} />
            <Tooltip formatter={(value) => formatYen(value as number)} />
            <Bar dataKey="expense_total" name="通常支出" fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="subscription_total" name="サブスク" fill="#DB2777" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>カテゴリ別分析</h2>
        </div>
        <div className="data-table">
          {(categoryReport?.categories ?? []).map((category) => (
            <div className="table-row" key={category.category_id}>
              <span className="color-dot" style={{ backgroundColor: category.color }} />
              <strong>{category.name}</strong>
              <span>{category.percentage}%</span>
              <strong>{formatYen(category.amount)}</strong>
            </div>
          ))}
          {(categoryReport?.categories ?? []).length === 0 && <p className="muted-text">この月の支出はまだありません。</p>}
        </div>
      </section>
    </section>
  );
}

export default ReportsPage;
