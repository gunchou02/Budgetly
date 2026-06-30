import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

const summary = {
  budget: 40000,
  expenses: 38000,
  subscriptions: 12000,
};

const totalSpent = summary.expenses + summary.subscriptions;
const remaining = summary.budget - totalSpent;
const usageRate = Math.round((totalSpent / summary.budget) * 100);

const categoryData = [
  { name: '食費', value: 18000, color: '#F97316' },
  { name: 'カフェ・スイーツ', value: 5200, color: '#A16207' },
  { name: '交通費', value: 6800, color: '#2563EB' },
  { name: 'サブスク', value: 12000, color: '#DB2777' },
  { name: 'その他', value: 8000, color: '#71717A' },
];

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

function DashboardPage() {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">2026年6月</p>
          <h1>今月の生活費</h1>
        </div>
        <span className={`status-pill ${remaining < 0 ? 'danger' : 'safe'}`}>
          {remaining < 0 ? '予算オーバー' : '余裕あり'}
        </span>
      </header>

      <div className="summary-grid">
        <article className="metric-card">
          <span>月間予算</span>
          <strong>{formatYen(summary.budget)}</strong>
        </article>
        <article className="metric-card">
          <span>利用済み</span>
          <strong>{formatYen(totalSpent)}</strong>
        </article>
        <article className="metric-card emphasis">
          <span>今月の残り</span>
          <strong>{formatYen(remaining)}</strong>
        </article>
        <article className="metric-card">
          <span>予算使用率</span>
          <strong>{usageRate}%</strong>
        </article>
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>カテゴリ別支出</h2>
          </div>
          <div className="chart-layout">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <ul className="legend-list">
              {categoryData.map((item) => (
                <li key={item.name}>
                  <span style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                  <strong>{formatYen(item.value)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>サブスク</h2>
          </div>
          <div className="subscription-list">
            <div>
              <span>Netflix</span>
              <strong>¥1,490</strong>
            </div>
            <div>
              <span>Spotify</span>
              <strong>¥980</strong>
            </div>
            <div>
              <span>iCloud</span>
              <strong>¥130</strong>
            </div>
          </div>
          <p className="insight danger-text">今月の生活費を {formatYen(Math.abs(remaining))} オーバーしています。</p>
        </section>
      </div>
    </section>
  );
}

export default DashboardPage;
