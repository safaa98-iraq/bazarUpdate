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
import { ClayIcon, type ClayIconName } from '@/components/ui/ClayIcon';

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
    <div className="px-4 sm:px-6 lg:px-8 pt-6 max-w-6xl space-y-4">
      <div className="h-40 rounded-3xl animate-pulse bg-white border border-bz-line" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse bg-white border border-bz-line" />)}
      </div>
    </div>
  );

  if (!store) return (
    <div className="px-4 py-16">
      <div className="max-w-md mx-auto text-center bz-card p-10">
        <ClayIcon name="store" size={96} className="mx-auto mb-5" />
        <h2 className="bz-title-2 text-bz-ink mb-2">أنشئ متجرك الأول</h2>
        <p className="text-sm text-bz-muted mb-7">ابدأ رحلتك التجارية الآن — يستغرق الأمر دقيقة واحدة فقط</p>
        <Link href="/dashboard/settings" className="bz-btn w-full h-12">
          <Plus className="h-5 w-5" strokeWidth={2.5} /> إنشاء متجر
        </Link>
      </div>
    </div>
  );

  const stats: { label: string; value: string; icon: ClayIconName; hint: string }[] = [
    { label: 'إجمالي المبيعات', value: formatCurrency(data?.totalRevenue ?? 0), icon: 'wallet', hint: 'منذ إنشاء المتجر' },
    { label: 'الطلبات', value: String(data?.totalOrders ?? 0), icon: 'cart', hint: 'كل الحالات' },
    { label: 'الأكثر مبيعاً', value: data?.topProducts?.[0]?.product?.name ?? '—', icon: 'box', hint: 'المنتج الأول' },
    { label: 'وحدات مباعة', value: String(data?.topProducts?.[0]?.totalSold ?? 0), icon: 'growth', hint: 'لأفضل منتج' },
  ];

  const quick: { label: string; href: string; icon: ClayIconName }[] = [
    { label: 'إضافة منتج', href: '/dashboard/products', icon: 'box' },
    { label: 'الطلبات', href: '/dashboard/orders', icon: 'cart' },
    { label: 'كوبون خصم', href: '/dashboard/coupons', icon: 'coupon' },
    { label: 'تصميم المتجر', href: '/dashboard/builder', icon: 'storefront' },
    { label: 'التوصيل', href: '/dashboard/settings', icon: 'truck' },
    { label: 'التسويق', href: '/dashboard/marketing', icon: 'megaphone' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-3xl bg-bz-ink text-white p-6 sm:p-8 mb-6">
        <span className="bz-blob w-72 h-72 bg-bz-brand -top-24 -left-16" />
        <span className="bz-blob w-56 h-56 bg-bz-brand-300 -bottom-28 left-1/3 opacity-30" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm text-bz-brand-300 mb-1">
              {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">أهلاً بك في {store.name} 👋</h1>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {store.isPublished
                ? <span className="bz-chip bg-white/10 text-white"><span className="h-2 w-2 rounded-full bg-bz-green" /> متجرك مفتوح · /store/{store.slug}</span>
                : <span className="bz-chip bg-[#FEF3E2] text-[#B45309]"><AlertTriangle size={13} /> المتجر غير منشور بعد</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/store/${store.slug}`} target="_blank" className="bz-btn h-11">
                زيارة المتجر <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link href="/dashboard/builder" className="bz-btn h-11 bg-white/10 hover:bg-white/15 shadow-none">
                تخصيص التصميم
              </Link>
            </div>
          </div>
          <ClayIcon name="storefront" size={150} className="hidden sm:block drop-shadow-xl" />
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon, hint }) => (
          <div key={label} className="bz-card p-4 sm:p-5 flex items-start gap-3">
            <span className="h-12 w-12 rounded-2xl bg-bz-brand-50 flex items-center justify-center flex-shrink-0">
              <ClayIcon name={icon} size={34} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-bz-muted">{label}</p>
              <p className="text-xl font-bold text-bz-ink truncate mt-0.5 tabular-nums">{value}</p>
              <p className="text-[11px] text-bz-muted mt-0.5">{hint}</p>
            </div>
          </div>
        ))}
      </div>

      <OnboardingChecklist />

      {/* Quick actions */}
      <section className="mb-6">
        <h2 className="bz-headline text-bz-ink mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quick.map(q => (
            <Link key={q.label} href={q.href}
              className="bz-card flex flex-col items-center justify-center gap-2 py-4 px-2 text-center hover:border-bz-brand-300 hover:-translate-y-0.5 transition-all">
              <ClayIcon name={q.icon} size={44} />
              <span className="text-[13px] font-semibold text-bz-ink-2">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {isFree && (
        <section className="mb-6 bz-card p-5 flex flex-wrap items-center gap-4 bg-gradient-to-l from-bz-brand-50 to-white">
          <ClayIcon name="star" size={56} />
          <div className="flex-1 min-w-[220px]">
            <p className="bz-headline text-bz-ink">أنت على الباقة المجانية</p>
            <p className="text-sm text-bz-muted mt-0.5">55 منتج • 3 تصنيفات • بدون تحليلات أو محادثات</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['منتجات غير محدودة', 'تحليلات متقدمة', 'مسوقون بالعمولة'].map(label => (
                <span key={label} className="bz-chip bg-white border border-bz-line text-bz-ink-2"><Lock className="h-3 w-3 text-bz-muted" /> {label}</span>
              ))}
            </div>
          </div>
          <Link href="/dashboard/upgrade" className="bz-btn">ترقية الباقة</Link>
        </section>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <section className="bz-card lg:col-span-3 overflow-hidden">
          <div className="flex items-center justify-between px-5 h-14 border-b border-bz-line">
            <h2 className="bz-headline text-bz-ink">آخر الطلبات</h2>
            <Link href="/dashboard/orders" className="text-[13px] font-semibold text-bz-brand-600 hover:underline">عرض الكل</Link>
          </div>
          {data?.recentOrders?.length ? data.recentOrders.map((order, i) => (
            <Link key={order.id} href="/dashboard/orders"
              className={`flex items-center gap-3 px-5 py-3.5 hover:bg-bz-brand-50 transition-colors ${i > 0 ? 'border-t border-bz-line' : ''}`}>
              <span className="h-10 w-10 rounded-full bg-bz-bg flex items-center justify-center text-sm font-bold text-bz-ink-2 flex-shrink-0">
                {order.customerName?.charAt(0) ?? '؟'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-bz-ink truncate">{order.customerName}</p>
                <p className="text-xs text-bz-muted">{formatDate(order.createdAt)}</p>
              </div>
              <Badge variant={statusColors[order.status] ?? 'default'}>{statusAr[order.status] ?? order.status}</Badge>
              <span className="text-sm font-bold text-bz-ink w-24 text-left tabular-nums">{formatCurrency(order.total)}</span>
            </Link>
          )) : (
            <div className="px-5 py-12 text-center">
              <ClayIcon name="cart" size={64} className="mx-auto mb-3 opacity-80" />
              <p className="text-sm text-bz-muted">لا توجد طلبات بعد</p>
            </div>
          )}
        </section>

        <section className="bz-card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 h-14 border-b border-bz-line">
            <h2 className="bz-headline text-bz-ink">الأكثر مبيعاً</h2>
            <ClayIcon name="pie-chart" size={26} />
          </div>
          {data?.topProducts?.length ? (() => {
            const max = Math.max(...data.topProducts.map(p => p.totalSold), 1);
            return data.topProducts.map((tp, i) => (
              <div key={i} className={`px-5 py-3.5 ${i > 0 ? 'border-t border-bz-line' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-bz-brand text-white' : 'bg-bz-bg text-bz-ink-2'}`}>{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-bz-ink truncate">{tp.product.name}</span>
                  <span className="text-xs text-bz-muted tabular-nums">{tp.totalSold} وحدة</span>
                </div>
                <div className="h-1.5 rounded-full bg-bz-bg overflow-hidden">
                  <div className="h-full rounded-full bg-bz-brand" style={{ width: `${(tp.totalSold / max) * 100}%` }} />
                </div>
              </div>
            ));
          })() : (
            <div className="px-5 py-12 text-center text-sm text-bz-muted">لا توجد بيانات مبيعات بعد</div>
          )}
        </section>
      </div>
    </div>
  );
}
