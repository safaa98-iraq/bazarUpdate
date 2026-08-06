'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Package, ShoppingBag, LogOut, ArrowRight } from 'lucide-react';
import type { OrderPublic } from '@storebuilder/types';

const C = { bg: '#FBF9F2', p: '#2F2E4B', a: '#DB6E93', border: '#DCE6F0', muted: '#6B6A83' };

const STATUS_LABELS: Record<string, string> = { PENDING: 'معلّق', PAID: 'مدفوع', SHIPPED: 'شُحن', DELIVERED: 'مُستلم', CANCELLED: 'ملغي' };
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: '#FEF3C7', color: '#92400E' },
  PAID: { bg: '#D1FAE5', color: '#065F46' },
  SHIPPED: { bg: '#DBEAFE', color: '#1E40AF' },
  DELIVERED: { bg: '#D1FAE5', color: '#065F46' },
  CANCELLED: { bg: '#FEE2E2', color: '#991B1B' },
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CustomerOrdersPage() {
  useDocumentTitle('طلباتي');
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || user?.role !== 'CUSTOMER') {
      router.push('/account/login?redirect=/account/orders');
      return;
    }
    api.get<{ success: boolean; data: OrderPublic[] }>('/api/customer/orders')
      .then(r => setOrders(r.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [_hasHydrated, token, user, router]);

  if (!_hasHydrated || loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.p, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user || user.role !== 'CUSTOMER') return null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Tajawal', sans-serif" }} dir="rtl">
      <nav style={{ background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 22, color: C.p, textDecoration: 'none' }}>بازار</Link>
          <button onClick={() => { logout(); router.push('/'); }} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: C.muted }}>
            <LogOut size={15} /> تسجيل الخروج
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 26, color: C.p, marginBottom: 4 }}>طلباتي</h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>مرحباً {user.name} — تابع حالة طلباتك من كل المتاجر</p>

        {orders.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 10, padding: '64px 24px', textAlign: 'center' }}>
            <ShoppingBag size={40} style={{ color: C.border, margin: '0 auto 12px' }} />
            <p style={{ color: C.muted }}>لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map(order => {
              const st = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING;
              return (
                <div key={order.id} style={{ background: '#fff', borderRadius: 10, padding: 20 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: C.p }}>{order.store?.name ?? 'متجر'}</p>
                      <p style={{ fontSize: 12, color: C.muted }}>{new Date(order.createdAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 99, background: st.bg, color: st.color }}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {order.items.slice(0, 5).map(item => (
                      <div key={item.id} style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: C.bg }}>
                        {item.product?.images?.[0]
                          ? <Image src={item.product.images[0]} alt={item.product.name} width={44} height={44} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Package size={16} style={{ color: C.border }} /></div>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13, color: C.muted }}>{order.items.length} منتج</span>
                    <span style={{ fontWeight: 700, color: C.a }}>{formatCurrency(order.total)}</span>
                  </div>
                  {order.store?.slug && (
                    <Link href={`/store/${order.store.slug}`} className="flex items-center gap-1 text-xs font-medium mt-2" style={{ color: C.p }}>
                      <ArrowRight size={12} /> زيارة المتجر
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
