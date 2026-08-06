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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EFFA' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #FBE1EA', borderTopColor: '#2F2E4B', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role !== 'MERCHANT') return null;

  return (
    <div className="flex min-h-screen" style={{ background: '#F5EFFA' }}>
      <div className="print:hidden contents">
        <DashboardSidebar />
      </div>
      <main className="flex-1 overflow-auto pt-14 lg:pt-0 print:pt-0 print:overflow-visible">{children}</main>
    </div>
  );
}
