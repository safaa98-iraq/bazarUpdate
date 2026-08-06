'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ShoppingCart, Package, DollarSign, Plus, ArrowLeft, Zap, Lock, Store, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Plan } from '@/lib/plan-features';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { trackPage } from '@/lib/track';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

interface DashboardData {
  totalRevenue: number; totalOrders: number;
  topProducts: { product: { name: string }; totalSold: number }[];
  recentOrders: { id: string; customerName: string; total: number; status: string; createdAt: string }[];
}
interface StoreData { id: string; name: string; slug: string; isPublished: boolean; }

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning', PAID: 'success', SHIPPED: 'default', DELIVERED: 'success', CANCELLED: 'destructive',
};
const statusAr: Record<string, string> = {
  PENDING: 'معلّق', PAID: 'مدفوع', SHIPPED: 'شُحن', DELIVERED: 'مُستلم', CANCELLED: 'ملغي',
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function DashboardOverview() {
  useDocumentTitle('لوحة التحكم');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const isFree = plan === 'FREE';
  const [store, setStore] = useState<StoreData | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPage('dashboard');
    async function load() {
      try {
        const storeRes = await api.get<{ success: boolean; data: StoreData }>('/api/stores/my');
        if (storeRes.data) {
          setStore(storeRes.data);
          await api.get<{ success: boolean; data: DashboardData }>(`/api/storefront/${storeRes.data.slug}/analytics`)
            .then(r => setData(r.data)).catch(() => null);
        }
      } catch { /* store not yet created */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#F0E7F8' }} />)}
    </div>
  );

  if (!store) return (
    <div className="p-8">
      <div className="max-w-md mx-auto text-center py-24">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: `${BRAND.primary}15` }}>
          <Store size={36} style={{ color: BRAND.primary }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: BRAND.primary }}>أنشئ متجرك الأول</h2>
        <p className="text-gray-500 mb-8">ابدأ رحلتك التجارية الآن — يستغرق الأمر دقيقة واحدة فقط</p>
        <Link href="/dashboard/settings"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> إنشاء متجر
        </Link>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>{store.name}</h1>
          <p className="text-sm mt-0.5">
            {store.isPublished
              ? <span style={{ color: '#10b981' }}>● مباشر على /store/{store.slug}</span>
              : <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={13} /> المتجر غير منشور بعد</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/builder"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition hover:bg-opacity-10"
            style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
            تخصيص المتجر
          </Link>
          <Link href={`/store/${store.slug}`} target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: BRAND.accent }}>
            عرض المتجر <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <OnboardingChecklist />

      {isFree && (
        <div className="mb-6 rounded-2xl overflow-hidden border" style={{ borderColor: '#C4B5FD' }}>
          <div className="px-5 py-4 flex items-center justify-between gap-4"
            style={{ background: 'linear-gradient(135deg, #EDE9FE, #FCE7F3)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
                <Zap className="h-5 w-5" style={{ color: '#7C3AED' }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#2F2E4B' }}>أنت على الخطة المجانية</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  55 منتج • 3 تصنيفات • بدون تحليلات أو محادثات
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings?tab=billing"
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #DB6E93)' }}>
              <Zap className="h-3.5 w-3.5" /> ارفع للـ PRO
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-x-reverse" style={{ background: '#FAF5FF', borderTop: '1px solid #E9D5FF' }}>
            {[
              'منتجات غير محدودة',
              'تحليلات متقدمة',
              'مسوقون بالعمولة',
            ].map(label => (
              <div key={label} className="flex items-center justify-center gap-1.5 py-2">
                <Lock className="h-3 w-3" style={{ color: '#9CA3AF' }} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي الإيرادات', value: formatCurrency(data?.totalRevenue ?? 0), icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
          { label: 'إجمالي الطلبات', value: String(data?.totalOrders ?? 0), icon: ShoppingCart, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'أفضل منتج', value: data?.topProducts?.[0]?.product?.name ?? '—', icon: Package, color: BRAND.secondary, bg: `${BRAND.secondary}20` },
          { label: 'وحدات مباعة', value: String(data?.topProducts?.[0]?.totalSold ?? 0), icon: TrendingUp, color: BRAND.accent, bg: `${BRAND.accent}20` },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border p-4 transition hover:shadow-md" style={{ borderColor: '#ECE6F0' }}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold truncate" style={{ color: BRAND.primary }}>{value}</p>
              </div>
              <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: bg }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {isFree && (
        <div className="relative mb-6 rounded-2xl overflow-hidden border" style={{ borderColor: '#ECE6F0' }}>
          <div className="p-5 opacity-30 pointer-events-none select-none blur-[2px]">
            <div className="grid grid-cols-3 gap-3">
              {[['إيرادات الأسبوع', '125,000 د.ع'], ['معدل التحويل', '3.4%'], ['زوار اليوم', '84']].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{l}</p>
                  <p className="text-xl font-bold text-gray-700">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl"
            style={{ background: 'rgba(250,245,255,0.85)' }}>
            <Lock className="h-7 w-7" style={{ color: '#7C3AED' }} />
            <p className="font-bold text-sm" style={{ color: '#2F2E4B' }}>التحليلات المتقدمة</p>
            <p className="text-xs text-gray-500 text-center max-w-xs px-4">إحصاءات المبيعات والزوار ومعدل التحويل متاحة في خطة PRO</p>
            <Link href="/dashboard/settings?tab=billing"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90 mt-1"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #DB6E93)' }}>
              <Zap className="h-3.5 w-3.5" /> ارفع للـ PRO
            </Link>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
            <h2 className="font-bold" style={{ color: BRAND.primary }}>آخر الطلبات</h2>
            <Link href="/dashboard/orders" className="text-sm font-medium" style={{ color: BRAND.accent }}>عرض الكل →</Link>
          </div>
          <div className="divide-y divide-[#F5EFFA]">
            {data?.recentOrders?.length ? data.recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition">
                <div>
                  <p className="font-medium text-sm text-gray-900">{order.customerName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusColors[order.status] ?? 'default'}>{statusAr[order.status] ?? order.status}</Badge>
                  <span className="font-bold text-sm" style={{ color: BRAND.primary }}>{formatCurrency(order.total)}</span>
                </div>
              </div>
            )) : (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">لا توجد طلبات بعد</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
            <h2 className="font-bold" style={{ color: BRAND.primary }}>أفضل المنتجات</h2>
          </div>
          <div className="divide-y divide-[#F5EFFA]">
            {data?.topProducts?.length ? data.topProducts.map((tp, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 flex items-center justify-center rounded-xl text-xs font-bold"
                    style={{ background: i === 0 ? BRAND.accent : `${BRAND.primary}15`, color: i === 0 ? 'white' : BRAND.primary }}>
                    {i + 1}
                  </span>
                  <span className="font-medium text-sm text-gray-900">{tp.product.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">{tp.totalSold} وحدة</span>
              </div>
            )) : (
              <div className="px-5 py-10 text-center text-gray-400 text-sm">لا توجد بيانات مبيعات بعد</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
