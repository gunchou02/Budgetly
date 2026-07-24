import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthContext';
import '@/styles.css';

export const metadata: Metadata = {
  title: 'Budgetly',
  description: '月間生活費・支出・サブスク管理サービス',
  applicationName: 'Budgetly',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Budgetly',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#111827',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
