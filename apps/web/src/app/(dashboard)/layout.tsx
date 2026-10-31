'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return; // wait for localStorage to load
    if (!token || !user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'MERCHANT') {
      router.push(user.role === 'SUPER_ADMIN' ? '/admin' : '/');
    }
  }, [token, user, router, _hasHydrated]);

  // Show nothing until hydration finishes — prevents flash-redirect to /login
  if (!_hasHydrated) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F2F2F7' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(60,60,67,.15)', borderTopColor: '#8E8E93', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role !== 'MERCHANT') return null;

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F2F7' }}>
      <div className="print:hidden contents">
        <DashboardSidebar />
      </div>
      <main className="flex-1 min-w-0 overflow-auto pt-14 pb-24 lg:pt-0 lg:pb-0 print:pt-0 print:pb-0 print:overflow-visible">{children}</main>
    </div>
  );
}
