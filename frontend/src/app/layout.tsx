import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/auth/AuthContext';
import '@/styles.css';

export const metadata: Metadata = {
  title: 'Budgetly',
  description: '月間生活費・支出・サブスク管理サービス',
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
