'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ShoppingCart, Package, DollarSign, Plus, ArrowLeft, Zap, Lock, Store, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Plan } from '@/lib/plan-features';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { trackPage } from '@/lib/track';

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
    <div className="px-5 lg:px-10 pt-8 max-w-5xl space-y-4">
      <div className="h-10 w-48 rounded-xl animate-pulse bg-gray-200" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-[18px] animate-pulse bg-white" />)}
      </div>
      <div className="h-64 rounded-[18px] animate-pulse bg-white" />
    </div>
  );

  if (!store) return (
    <div className="px-6 py-24">
      <div className="max-w-sm mx-auto text-center">
        <div className="w-24 h-24 rounded-[26px] flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: 'linear-gradient(160deg, #0A84FF, #5E5CE6)' }}>
          <Store size={44} className="text-white" strokeWidth={2} />
        </div>
        <h2 className="ios-title-2 text-gray-900 mb-2">أنشئ متجرك الأول</h2>
        <p className="text-[15px] text-gray-500 mb-8">ابدأ رحلتك التجارية الآن — يستغرق الأمر دقيقة واحدة فقط</p>
        <Link href="/dashboard/settings" className="ios-btn w-full h-[50px] rounded-[14px]">
          <Plus className="h-5 w-5" strokeWidth={2.5} /> إنشاء متجر
        </Link>
      </div>
    </div>
  );

  const stats = [
    { label: 'الإيرادات', value: formatCurrency(data?.totalRevenue ?? 0), icon: DollarSign, tint: '#34C759' },
    { label: 'الطلبات', value: String(data?.totalOrders ?? 0), icon: ShoppingCart, tint: '#007AFF' },
    { label: 'أفضل منتج', value: data?.topProducts?.[0]?.product?.name ?? '—', icon: Package, tint: '#FF9500' },
    { label: 'وحدات مباعة', value: String(data?.topProducts?.[0]?.totalSold ?? 0), icon: TrendingUp, tint: '#AF52DE' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-10 max-w-5xl">
      {/* Large title */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase text-gray-500 mb-1">
            {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="ios-large-title text-gray-900 truncate">{store.name}</h1>
          <div className="mt-2">
            {store.isPublished
              ? <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold bg-[rgba(52,199,89,0.14)] text-[#248A3D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-ios-green" /> مباشر · /store/{store.slug}
                </span>
              : <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold bg-[rgba(255,149,0,0.14)] text-[#C93400]">
                  <AlertTriangle size={12} /> المتجر غير منشور بعد
                </span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/builder" className="ios-btn ios-btn-tinted h-9 px-4 text-[15px] rounded-full">
            تخصيص المتجر
          </Link>
          <Link href={`/store/${store.slug}`} target="_blank" className="ios-btn h-9 px-4 text-[15px] rounded-full">
            عرض المتجر <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <OnboardingChecklist />

      {/* Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="ios-card p-4 flex flex-col justify-between min-h-[112px]">
            <div className="flex items-center gap-2">
              <span className="ios-icon !w-6 !h-6 !rounded-[6px]" style={{ background: tint }}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="text-[13px] font-semibold" style={{ color: tint }}>{label}</span>
            </div>
            <p className="text-[24px] font-bold text-gray-900 truncate mt-3 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {isFree && (
        <div className="mb-6">
          <p className="px-4 pb-1.5 text-[13px] text-gray-500">باقتك</p>
          <div className="ios-group">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="ios-icon" style={{ background: 'linear-gradient(160deg, #BF5AF2, #5E5CE6)' }}>
                <Zap className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-gray-900">أنت على الخطة المجانية</p>
                <p className="text-[13px] text-gray-500">55 منتج • 3 تصنيفات • بدون تحليلات أو محادثات</p>
              </div>
              <Link href="/dashboard/upgrade" className="ios-btn h-8 px-4 text-[13px] rounded-full flex-shrink-0">ترقية</Link>
            </div>
            {['منتجات غير محدودة', 'تحليلات متقدمة', 'مسوقون بالعمولة'].map(label => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 ps-[60px]">
                <span className="flex-1 text-[15px] text-gray-900">{label}</span>
                <Lock className="h-4 w-4 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-baseline justify-between px-4 pb-1.5">
            <h2 className="text-[20px] font-bold text-gray-900">آخر الطلبات</h2>
            <Link href="/dashboard/orders" className="text-[15px] text-ios-blue">عرض الكل</Link>
          </div>
          <div className="ios-group">
            {data?.recentOrders?.length ? data.recentOrders.map(order => (
              <Link key={order.id} href="/dashboard/orders" className="flex items-center gap-3 px-4 py-3 active:bg-gray-100 transition-colors">
                <span className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-[15px] font-semibold text-gray-600 flex-shrink-0">
                  {order.customerName?.charAt(0) ?? '؟'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 truncate">{order.customerName}</p>
                  <p className="text-[13px] text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-semibold text-gray-900 tabular-nums">{formatCurrency(order.total)}</p>
                  <Badge variant={statusColors[order.status] ?? 'default'} className="mt-0.5">{statusAr[order.status] ?? order.status}</Badge>
                </div>
                <ChevronLeft className="h-4 w-4 text-gray-300 flex-shrink-0" strokeWidth={2.75} />
              </Link>
            )) : (
              <div className="px-4 py-10 text-center text-[15px] text-gray-500">لا توجد طلبات بعد</div>
            )}
          </div>
        </section>

        <section>
          <div className="px-4 pb-1.5">
            <h2 className="text-[20px] font-bold text-gray-900">أفضل المنتجات</h2>
          </div>
          <div className="ios-group">
            {data?.topProducts?.length ? data.topProducts.map((tp, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold"
                  style={{ background: i === 0 ? '#FFCC00' : i === 1 ? '#D1D1D6' : i === 2 ? '#E8A87C' : 'rgba(120,120,128,.12)', color: i < 3 ? '#fff' : '#8E8E93' }}>
                  {i + 1}
                </span>
                <span className="flex-1 text-[15px] text-gray-900 truncate">{tp.product.name}</span>
                <span className="text-[15px] text-gray-500 tabular-nums">{tp.totalSold} وحدة</span>
              </div>
            )) : (
              <div className="px-4 py-10 text-center text-[15px] text-gray-500">لا توجد بيانات مبيعات بعد</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
