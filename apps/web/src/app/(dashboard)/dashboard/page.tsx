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
    <div className="px-4 sm:px-8 pt-8 max-w-6xl space-y-4">
      <p className="b-label animate-pulse">LOADING_DATA ▌</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 b-flat b-stripes opacity-30" />)}
      </div>
    </div>
  );

  if (!store) return (
    <div className="px-4 sm:px-8 py-16 max-w-3xl">
      <p className="b-label mb-4">STATUS: NO_STORE</p>
      <h2 className="b-display mb-6">أنشئ متجرك<br />الأول.</h2>
      <p className="text-lg mb-8 max-w-md">ابدأ رحلتك التجارية الآن — يستغرق الأمر دقيقة واحدة فقط.</p>
      <Link href="/dashboard/settings" className="b-btn h-14 px-8 text-lg">
        <Plus className="h-5 w-5" strokeWidth={3} /> إنشاء متجر
      </Link>
    </div>
  );

  const stats = [
    { code: 'REV', label: 'الإيرادات', value: formatCurrency(data?.totalRevenue ?? 0), icon: DollarSign, bg: 'bg-b-yellow', fg: 'text-b-ink' },
    { code: 'ORD', label: 'الطلبات', value: String(data?.totalOrders ?? 0), icon: ShoppingCart, bg: 'bg-b-blue', fg: 'text-white' },
    { code: 'TOP', label: 'أفضل منتج', value: data?.topProducts?.[0]?.product?.name ?? '—', icon: Package, bg: 'bg-white', fg: 'text-b-ink' },
    { code: 'QTY', label: 'وحدات مباعة', value: String(data?.topProducts?.[0]?.totalSold ?? 0), icon: TrendingUp, bg: 'bg-b-orange', fg: 'text-b-ink' },
  ];

  return (
    <div className="px-4 sm:px-8 pt-6 lg:pt-10 pb-12 max-w-6xl">
      {/* Masthead */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="b-tag bg-white">
          {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        {store.isPublished
          ? <span className="b-tag bg-b-green text-white"><span className="h-2 w-2 bg-white animate-pulse" /> LIVE · /store/{store.slug}</span>
          : <span className="b-tag bg-b-orange"><AlertTriangle size={12} strokeWidth={3} /> غير منشور</span>}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8 pb-6 border-b-4 border-b-ink">
        <h1 className="b-display min-w-0 break-words">{store.name}</h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/builder" className="b-btn b-btn-white">تخصيص المتجر</Link>
          <Link href={`/store/${store.slug}`} target="_blank" className="b-btn b-btn-ink">
            عرض المتجر <ArrowLeft className="h-4 w-4" strokeWidth={3} />
          </Link>
        </div>
      </div>

      <OnboardingChecklist />

      {/* Stat blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ code, label, value, icon: Icon, bg, fg }) => (
          <div key={code} className={`${bg} ${fg} border-2 border-b-ink shadow-brut p-4 flex flex-col justify-between min-h-[132px]`}>
            <div className="flex items-start justify-between">
              <span className="b-label">{label}</span>
              <Icon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[28px] font-bold leading-none truncate font-mono tracking-tight">{value}</p>
              <p className="b-label opacity-60 mt-2">[{code}]</p>
            </div>
          </div>
        ))}
      </div>

      {isFree && (
        <div className="mb-8 border-2 border-b-ink shadow-brut bg-white">
          <div className="flex flex-wrap items-center gap-4 p-4 border-b-2 border-b-ink">
            <span className="h-11 w-11 bg-b-ink text-b-yellow flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5" strokeWidth={3} />
            </span>
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-lg leading-tight">أنت على الخطة المجانية</p>
              <p className="font-mono text-xs text-gray-500 mt-1">55 منتج • 3 تصنيفات • بدون تحليلات أو محادثات</p>
            </div>
            <Link href="/dashboard/upgrade" className="b-btn b-btn-blue">ترقية ←</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {['منتجات غير محدودة', 'تحليلات متقدمة', 'مسوقون بالعمولة'].map((label, i) => (
              <div key={label} className={`flex items-center justify-between gap-2 px-4 py-3 ${i > 0 ? 'sm:border-r-2 border-t-2 sm:border-t-0 border-b-ink' : ''}`}>
                <span className="text-sm font-medium">{label}</span>
                <Lock className="h-4 w-4" strokeWidth={2.5} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="border-2 border-b-ink shadow-brut bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-b-ink bg-b-ink text-white">
            <h2 className="font-bold">آخر الطلبات</h2>
            <Link href="/dashboard/orders" className="b-label text-b-yellow hover:underline">VIEW ALL →</Link>
          </div>
          {data?.recentOrders?.length ? data.recentOrders.map((order, i) => (
            <Link key={order.id} href="/dashboard/orders"
              className={`flex items-center gap-3 px-4 py-3 hover:bg-b-yellow ${i > 0 ? 'border-t-2 border-b-ink' : ''}`}>
              <span className="font-mono text-xs font-bold text-gray-400 w-6">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{order.customerName}</p>
                <p className="font-mono text-[11px] text-gray-500">{formatDate(order.createdAt)}</p>
              </div>
              <Badge variant={statusColors[order.status] ?? 'default'}>{statusAr[order.status] ?? order.status}</Badge>
              <span className="font-mono font-bold text-sm w-28 text-left tabular-nums">{formatCurrency(order.total)}</span>
            </Link>
          )) : (
            <div className="px-4 py-10 text-center font-mono text-sm text-gray-500">// لا توجد طلبات بعد</div>
          )}
        </section>

        <section className="border-2 border-b-ink shadow-brut bg-white">
          <div className="px-4 py-3 border-b-2 border-b-ink bg-b-ink text-white">
            <h2 className="font-bold">أفضل المنتجات</h2>
          </div>
          {data?.topProducts?.length ? (() => {
            const max = Math.max(...data.topProducts.map(p => p.totalSold), 1);
            return data.topProducts.map((tp, i) => (
              <div key={i} className={`px-4 py-3 ${i > 0 ? 'border-t-2 border-b-ink' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`h-7 w-7 flex items-center justify-center font-mono text-xs font-bold border-2 border-b-ink ${i === 0 ? 'bg-b-yellow' : 'bg-white'}`}>{i + 1}</span>
                  <span className="flex-1 font-bold truncate">{tp.product.name}</span>
                  <span className="font-mono text-sm font-bold">{tp.totalSold}<span className="text-gray-500 font-normal"> وحدة</span></span>
                </div>
                <div className="h-3 border-2 border-b-ink bg-b-paper">
                  <div className={`h-full ${i === 0 ? 'bg-b-blue' : 'bg-b-ink'}`} style={{ width: `${(tp.totalSold / max) * 100}%` }} />
                </div>
              </div>
            ));
          })() : (
            <div className="px-4 py-10 text-center font-mono text-sm text-gray-500">// لا توجد بيانات مبيعات بعد</div>
          )}
        </section>
      </div>
    </div>
  );
}
