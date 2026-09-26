'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import AppLoading from '@/components/AppLoading';
import { useAuth } from '@/auth/AuthContext';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping } = useAuth();

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isBootstrapping, router]);

  if (isBootstrapping || !isAuthenticated) {
    return <AppLoading />;
  }

  return <AppShell>{children}</AppShell>;
}
