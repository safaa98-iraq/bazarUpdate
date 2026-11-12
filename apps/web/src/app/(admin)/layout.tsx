'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LocaleRoot, DomTranslator } from '@/lib/i18n';
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F8FA' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(60,60,67,.15)', borderTopColor: '#7A8A99', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  return (
    <LocaleRoot className="flex min-h-screen" style={{ background: '#F6F8FA' }}>
      <DomTranslator />
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminEditorBanner />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </LocaleRoot>
  );
}
