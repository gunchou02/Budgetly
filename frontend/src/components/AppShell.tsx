'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChartPie, CreditCard, LayoutDashboard, LogOut, WalletCards } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import BrandMark from '@/components/BrandMark';
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
  const currentPageLabel = navigation.find((item) => item.to === pathname)?.label ?? 'ホーム';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">
        <div className="brand">
          <BrandMark priority />
          <div>
            <strong>Budgetly</strong>
          </div>
        </div>

        <nav className="nav-list" aria-label="メインナビゲーション">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.to;

            return (
              <Link
                key={item.to}
                href={item.to}
                className={`nav-link${isActive ? ' active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
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

      <header className="mobile-header">
        <Link href="/dashboard" className="mobile-brand" aria-label="Budgetly ホーム">
          <BrandMark size={32} />
          <strong>Budgetly</strong>
        </Link>
        <span className="mobile-page-label">{currentPageLabel}</span>
        <button
          type="button"
          className="mobile-logout-button"
          onClick={handleLogout}
          aria-label="ログアウト"
          title="ログアウト"
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="main-content">{children}</main>

      <nav className="mobile-nav" aria-label="モバイルメインナビゲーション">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.to;

          return (
            <Link
              key={item.to}
              href={item.to}
              className={`mobile-nav-link${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
