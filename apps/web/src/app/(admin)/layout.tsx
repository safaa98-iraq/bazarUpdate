'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminEditorBanner } from '@/components/layout/AdminEditorBanner';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return; // wait for localStorage to load
    if (!token || !user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'SUPER_ADMIN') {
      router.push(user.role === 'MERCHANT' ? '/dashboard' : '/');
    }
  }, [token, user, router, _hasHydrated]);

  // Show nothing until hydration finishes — prevents flash-redirect to /login
  if (!_hasHydrated) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EFFA' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #FBE1EA', borderTopColor: '#2F2E4B', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="flex min-h-screen" style={{ background: '#F5EFFA' }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminEditorBanner />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
