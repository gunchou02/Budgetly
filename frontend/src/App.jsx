import { NavLink, Outlet } from "react-router-dom";
import {
  ChartPie,
  CreditCard,
  LayoutDashboard,
  LogOut,
  WalletCards,
} from "lucide-react";
import { useAuth } from "./auth/AuthContext";

const navigation = [
  { to: "/dashboard", label: "ホーム", icon: LayoutDashboard },
  { to: "/budgets", label: "予算", icon: WalletCards },
  { to: "/subscriptions", label: "サブスク", icon: CreditCard },
  { to: "/reports", label: "分析", icon: ChartPie },
];

function App() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>Budgetly</strong>
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

        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <button type="button" className="ghost-button" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            ログアウト
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
