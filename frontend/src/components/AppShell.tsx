'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChartPie, CreditCard, LayoutDashboard, LogOut, WalletCards } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import type { ReactNode } from 'react';

const navigation = [
  { to: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
  { to: '/budgets', label: '予算', icon: WalletCards },
  { to: '/subscriptions', label: 'サブスク', icon: CreditCard },
  { to: '/reports', label: '分析', icon: ChartPie },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

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
            const isActive = pathname === item.to;

            return (
              <Link key={item.to} href={item.to} className={`nav-link${isActive ? ' active' : ''}`}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span>{user?.email}</span>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" />
            ログアウト
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
