import { NavLink, Outlet } from 'react-router-dom';
import { ChartPie, CreditCard, LayoutDashboard, ReceiptText, WalletCards } from 'lucide-react';

const navigation = [
  { to: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { to: '/expenses', label: '支出', icon: ReceiptText },
  { to: '/subscriptions', label: 'サブスク', icon: CreditCard },
  { to: '/budgets', label: '予算', icon: WalletCards },
  { to: '/reports', label: 'レポート', icon: ChartPie },
];

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>Budgetly</strong>
            <span>生活費管理</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="メインナビゲーション">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className="nav-link">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
