'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from 'recharts';
import { Users, TrendingDown, Activity, AlertTriangle, ChevronRight } from 'lucide-react';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#F5EFFA', border: '#FBE1EA' };

interface FunnelStep { step: string; count: number; }
interface FeatureRow  { event: string; uses: number; merchants: number; }
interface DayRow      { day: string; merchants: number; }
interface DropRow     { label: string; count: number; }
interface PageRow     { page: string; visits: number; }

interface TrackData {
  funnel: FunnelStep[];
  featureUsage: FeatureRow[];
  dailyActive: DayRow[];
  dropOff: DropRow[];
  topPages: PageRow[];
  staleMerchants: number;
}

const EVENT_LABELS: Record<string, string> = {
  page_view:              'مشاهدة صفحة',
  product_added:          'أضاف منتجاً',
  product_edited:         'عدّل منتجاً',
  category_added:         'أضاف تصنيفاً',
  builder_opened:         'فتح المصمم',
  builder_section_added:  'أضاف قسم (مصمم)',
  builder_published:      'نشر المتجر',
  settings_saved:         'حفظ الإعدادات',
  upgrade_clicked:        'نقر ترقية الباقة',
  onboarding_step_completed: 'أكمل خطوة إعداد',
  order_status_updated:   'حدّث حالة طلب',
  coupon_created:         'أنشأ كوبون',
  banner_added:           'أضاف بانر',
  chat_sent:              'أرسل رسالة دعم',
};

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'الرئيسية', products: 'المنتجات', orders: 'الطلبات',
  categories: 'التصنيفات', builder: 'المصمم', settings: 'الإعدادات',
  marketing: 'التسويق', upgrade: 'الترقية', chat: 'الرسائل',
  banners: 'البانرات', affiliates: 'المسوقون', coupons: 'الكوبونات',
};

function KpiCard({ title, value, sub, icon, bg }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; bg: string;
}) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${B.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold" style={{ color: B.p }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function MerchantAnalyticsPage() {
  useDocumentTitle('تحليلات التجار');
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: TrackData }>('/api/track/admin')
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#ECE6F0' }} />)}
    </div>
  );

  if (error || !data) return (
    <div className="p-8 text-center">
      <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-400" />
      <p className="font-bold" style={{ color: B.p }}>لا توجد بيانات بعد</p>
      <p className="text-sm text-gray-500 mt-1">ستظهر البيانات بعد بدء نشاط التجار</p>
    </div>
  );

  // Funnel drop-off rates
  const funnelWithPct = data.funnel.map((step, i) => ({
    ...step,
    pct: i === 0 ? 100 : data.funnel[0].count > 0
      ? Math.round((step.count / data.funnel[0].count) * 100)
      : 0,
    dropped: i > 0 ? data.funnel[i-1].count - step.count : 0,
  }));

  return (
    <div className="p-6 max-w-6xl space-y-6" dir="rtl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: B.p }}>تحليلات سلوك التجار</h1>
        <p className="text-sm text-gray-500 mt-1">تتبع كيف يبنون متاجرهم وأين يتوقفون</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="إجمالي التجار"
          value={data.funnel[0]?.count ?? 0}
          icon={<Users className="h-5 w-5" style={{ color: B.s }} />}
          bg="#F0E7F8"
        />
        <KpiCard
          title="أكملوا الإعداد"
          value={`${data.funnel[data.funnel.length - 1]?.count ?? 0}`}
          sub={`${funnelWithPct[funnelWithPct.length-1]?.pct ?? 0}% من المسجلين`}
          icon={<Activity className="h-5 w-5" style={{ color: '#10b981' }} />}
          bg="#D1FAE5"
        />
        <KpiCard
          title="خاملون +7 أيام"
          value={data.staleMerchants}
          sub="لديهم متجر، لم يدخلوا"
          icon={<TrendingDown className="h-5 w-5" style={{ color: B.a }} />}
          bg="#FCE7EC"
        />
        <KpiCard
          title="نشاط أمس"
          value={data.dailyActive.at(-1)?.merchants ?? 0}
          sub="تاجر نشط"
          icon={<Activity className="h-5 w-5" style={{ color: '#3b82f6' }} />}
          bg="#DBEAFE"
        />
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${B.border}` }}>
        <h2 className="font-bold mb-1" style={{ color: B.p }}>قمع بناء المتجر</h2>
        <p className="text-xs text-gray-400 mb-5">كم تاجراً أتمّ كل خطوة من خطوات الإعداد</p>
        <div className="space-y-3">
          {funnelWithPct.map((step, i) => (
            <div key={step.step}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ background: i === 0 ? B.p : step.pct > 60 ? '#10b981' : step.pct > 30 ? '#f59e0b' : '#ef4444' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium" style={{ color: B.p }}>{step.step}</span>
                  {step.dropped > 0 && (
                    <span className="text-xs text-red-400">
                      ↓ {step.dropped} تركوا هنا
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: B.p }}>{step.count.toLocaleString('ar')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: step.pct > 60 ? '#D1FAE5' : step.pct > 30 ? '#FEF3C7' : '#FEE2E2',
                      color: step.pct > 60 ? '#065F46' : step.pct > 30 ? '#92400E' : '#991B1B',
                    }}>
                    {step.pct}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${step.pct}%`,
                    background: step.pct > 60 ? '#10b981' : step.pct > 30 ? '#f59e0b' : '#ef4444',
                  }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Drop-off Problems */}
        <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${B.border}` }}>
          <h2 className="font-bold mb-1" style={{ color: B.p }}>نقاط التوقف</h2>
          <p className="text-xs text-gray-400 mb-4">تجار عالقون في هذه المرحلة</p>
          <div className="space-y-3">
            {data.dropOff.map(row => (
              <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: B.soft }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#FEE2E2' }}>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: B.p }}>{row.label}</p>
                </div>
                <span className="text-lg font-bold" style={{ color: B.a }}>{row.count.toLocaleString('ar')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Active */}
        <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${B.border}` }}>
          <h2 className="font-bold mb-1" style={{ color: B.p }}>النشاط اليومي</h2>
          <p className="text-xs text-gray-400 mb-4">عدد التجار النشطين يومياً (آخر 14 يوم)</p>
          {data.dailyActive.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.dailyActive} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [v, 'تاجر']}
                  labelFormatter={l => `يوم ${l}`}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${B.border}`, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="merchants" stroke={B.a} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              لا يوجد نشاط مسجّل بعد
            </div>
          )}
        </div>
      </div>

      {/* Feature Usage */}
      <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${B.border}` }}>
        <h2 className="font-bold mb-1" style={{ color: B.p }}>استخدام الميزات</h2>
        <p className="text-xs text-gray-400 mb-5">أكثر الإجراءات التي يقوم بها التجار (آخر 30 يوم)</p>
        {data.featureUsage.length > 0 ? (
          <div className="space-y-2">
            {data.featureUsage.slice(0, 12).map((row, i) => {
              const maxUses = data.featureUsage[0]?.uses ?? 1;
              const pct = Math.round((row.uses / maxUses) * 100);
              return (
                <div key={row.event} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4 text-left flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium truncate" style={{ color: B.p }}>
                        {EVENT_LABELS[row.event] ?? row.event}
                      </span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-400">{row.merchants} تاجر</span>
                        <span className="text-xs font-bold" style={{ color: B.a }}>{row.uses.toLocaleString('ar')}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${B.p}, ${B.a})` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-400 text-sm">
            لا توجد بيانات بعد — ستظهر بعد تفاعل التجار مع اللوحة
          </div>
        )}
      </div>

      {/* Top Pages */}
      {data.topPages.length > 0 && (
        <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${B.border}` }}>
          <h2 className="font-bold mb-1" style={{ color: B.p }}>الصفحات الأكثر زيارة</h2>
          <p className="text-xs text-gray-400 mb-5">آخر 30 يوم</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.topPages.map(r => ({ ...r, name: PAGE_LABELS[r.page] ?? r.page }))}
              margin={{ top: 5, right: 5, bottom: 20, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [v, 'زيارة']}
                contentStyle={{ borderRadius: 10, border: `1px solid ${B.border}`, fontSize: 12 }}
              />
              <Bar dataKey="visits" radius={[6, 6, 0, 0]}>
                {data.topPages.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? B.a : i < 3 ? B.p : B.s} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
