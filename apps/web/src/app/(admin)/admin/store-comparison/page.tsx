'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StoreComparisonRow } from '@storebuilder/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { GitCompare, TrendingUp, TrendingDown, Minus, Search, ArrowUpDown, Store as StoreIcon } from 'lucide-react';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#F5EFFA', border: '#FBE1EA' };

type SortKey = 'totalRevenue' | 'totalOrders' | 'avgOrderValue' | 'productCount' | 'growthPercent' | 'createdAt';

function KpiCard({ title, value, sub, icon }: { title: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: `1px solid ${B.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold" style={{ color: B.p }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: B.soft }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400 flex items-center gap-1"><Minus className="h-3 w-3" /> لا يوجد سجل</span>;
  const positive = pct > 0;
  const flat = pct === 0;
  return (
    <span className="text-xs font-bold flex items-center gap-1"
      style={{ color: flat ? '#9ca3af' : positive ? '#059669' : '#dc2626' }}>
      {flat ? <Minus className="h-3 w-3" /> : positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive && !flat ? '+' : ''}{pct}%
    </span>
  );
}

export default function StoreComparisonPage() {
  useDocumentTitle('مقارنة المتاجر');
  const [rows, setRows] = useState<StoreComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    api.get<{ success: boolean; data: StoreComparisonRow[] }>('/api/admin/analytics/compare-stores')
      .then(r => setRows(r.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter(r => r.storeName.toLowerCase().includes(q) || r.merchantName.toLowerCase().includes(q))
      : rows;
    return [...list].sort((a, b) => {
      const av = sortKey === 'createdAt' ? new Date(a.createdAt).getTime() : (a[sortKey] ?? -Infinity) as number;
      const bv = sortKey === 'createdAt' ? new Date(b.createdAt).getTime() : (b[sortKey] ?? -Infinity) as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [rows, search, sortKey, sortDir]);

  const totals = useMemo(() => ({
    stores: rows.length,
    revenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    orders: rows.reduce((s, r) => s + r.totalOrders, 0),
    growing: rows.filter(r => (r.growthPercent ?? 0) > 0).length,
    declining: rows.filter(r => r.growthPercent !== null && r.growthPercent < 0).length,
  }), [rows]);

  const topByRevenue = useMemo(
    () => [...rows].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 8)
      .map(r => ({ name: r.storeName.length > 12 ? r.storeName.slice(0, 12) + '…' : r.storeName, revenue: r.totalRevenue })),
    [rows]
  );

  const th = (label: string, key: SortKey, align: 'right' | 'center' = 'center') => (
    <th className={`px-3 py-2.5 text-${align} cursor-pointer select-none whitespace-nowrap`} onClick={() => toggleSort(key)}>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 transition">
        {label} <ArrowUpDown className="h-3 w-3" style={{ opacity: sortKey === key ? 1 : 0.3 }} />
      </span>
    </th>
  );

  if (loading) return (
    <div className="p-6 space-y-4" dir="rtl">
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#ECE6F0' }} />)}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: B.p }}>
          <GitCompare className="h-6 w-6" style={{ color: B.a }} /> مقارنة أداء المتاجر
        </h1>
        <p className="text-sm text-gray-500 mt-1">قارن الإيرادات والنمو والنشاط بين متاجر التجار</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="إجمالي المتاجر" value={totals.stores} icon={<StoreIcon className="h-5 w-5" style={{ color: B.s }} />} />
        <KpiCard title="إجمالي الإيرادات" value={formatCurrency(totals.revenue)} icon={<TrendingUp className="h-5 w-5" style={{ color: '#10b981' }} />} />
        <KpiCard title="متاجر في نمو" value={totals.growing} sub="مقارنة بالشهر الماضي" icon={<TrendingUp className="h-5 w-5" style={{ color: '#059669' }} />} />
        <KpiCard title="متاجر في تراجع" value={totals.declining} sub="مقارنة بالشهر الماضي" icon={<TrendingDown className="h-5 w-5" style={{ color: '#dc2626' }} />} />
      </div>

      {topByRevenue.length > 0 && (
        <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${B.border}` }}>
          <h2 className="font-bold mb-1" style={{ color: B.p }}>الأعلى إيراداً</h2>
          <p className="text-xs text-gray-400 mb-5">أفضل 8 متاجر حسب إجمالي الإيرادات</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topByRevenue} margin={{ top: 5, right: 5, bottom: 20, left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'الإيراد']} contentStyle={{ borderRadius: 10, border: `1px solid ${B.border}`, fontSize: 12 }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {topByRevenue.map((_, i) => <Cell key={i} fill={i === 0 ? B.a : i < 3 ? B.p : B.s} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1px solid ${B.border}` }}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: B.border }}>
          <div className="relative flex-1 max-w-xs">
            <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم المتجر أو التاجر…"
              className="w-full pr-9 pl-3 py-2 rounded-xl border text-sm focus:outline-none transition" style={{ borderColor: '#ECE6F0' }} />
          </div>
          <span className="text-xs text-gray-400 mr-auto">{filtered.length} من {rows.length} متجر</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">لا توجد نتائج مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: B.border, background: B.soft }}>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500">المتجر</th>
                  {th('المنتجات', 'productCount')}
                  {th('الطلبات', 'totalOrders')}
                  {th('الإيراد الكلي', 'totalRevenue')}
                  {th('متوسط الطلب', 'avgOrderValue')}
                  {th('النمو الشهري', 'growthPercent')}
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">التصنيف الأكثر مبيعاً</th>
                  {th('تاريخ الإنشاء', 'createdAt')}
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.storeId} className="border-b hover:bg-gray-50 transition" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-3 py-3">
                      <p className="font-semibold" style={{ color: B.p }}>{r.storeName}</p>
                      <p className="text-xs text-gray-400">{r.merchantName} · {r.plan}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-700">{r.productCount}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{r.totalOrders}</td>
                    <td className="px-3 py-3 text-center font-bold" style={{ color: B.p }}>{formatCurrency(r.totalRevenue)}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{formatCurrency(r.avgOrderValue)}</td>
                    <td className="px-3 py-3 text-center"><GrowthBadge pct={r.growthPercent} /></td>
                    <td className="px-3 py-3 text-center text-gray-600">{r.topCategory ?? '—'}</td>
                    <td className="px-3 py-3 text-center text-xs text-gray-400">{formatDate(r.createdAt)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: r.isActive ? '#D1FAE5' : '#FEE2E2', color: r.isActive ? '#065F46' : '#991B1B' }}>
                        {r.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
