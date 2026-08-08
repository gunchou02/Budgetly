'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartPie,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  WalletCards,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import BrandMark from '@/components/BrandMark';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const currentPageLabel = navigation.find((item) => item.to === pathname)?.label ?? 'ホーム';
  const isGuest = user?.is_guest ?? false;

  async function handleLogout() {
    if (
      isGuest &&
      !window.confirm(
        'ゲストデータは削除され、元に戻せません。ゲスト利用を終了しますか？',
      )
    ) {
      return;
    }

    setLogoutError('');
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      setLogoutError(getApiErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
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
          <div className="sidebar-account">
            <strong>{isGuest ? 'ゲスト利用中' : user?.email}</strong>
            {isGuest && <span>終了するとデータを削除</span>}
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={16} aria-hidden="true" />
            {isLoggingOut
              ? '終了中...'
              : isGuest
                ? 'ゲスト利用を終了'
                : 'ログアウト'}
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
          disabled={isLoggingOut}
          aria-label={isGuest ? 'ゲスト利用を終了' : 'ログアウト'}
          title={isGuest ? 'ゲスト利用を終了' : 'ログアウト'}
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="main-content">
        {logoutError && (
          <p className="form-error shell-error" role="alert">
            {logoutError}
          </p>
        )}
        {isGuest && (
          <aside className="guest-mode-notice" aria-label="ゲスト利用について">
            <Clock3 size={18} aria-hidden="true" />
            <p>
              <strong>ゲストモード</strong>
              <span>主要機能を24時間利用できます。利用終了時にデータを削除します。</span>
            </p>
          </aside>
        )}
        {children}
      </main>

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
