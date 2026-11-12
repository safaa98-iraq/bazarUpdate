'use client';

import { useT } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import {
  Store, Package, DollarSign, ShoppingCart, CheckCircle, XCircle, Clock,
  Star, StarOff, TrendingUp, Settings, BarChart2, RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type Application = {
  id: string; storeId: string; storeName: string; slug: string; logo: string | null;
  merchantName: string; merchantEmail: string;
  applicationStatus: string; createdAt: string;
};

type Listing = {
  id: string; name: string; images: string[]; storeName: string;
  originalPrice: number; marketplacePrice: number | null;
  approvalStatus: string; isFeatured: boolean; categoryTag: string | null;
};

type Commission = { id: string; categoryTag: string; commissionRate: number };
type Analytics = {
  totalOrders: number; totalRevenue: number; uniqueCustomers: number; avgOrderValue: number;
  totalStores: number; activeStores: number;
  revenueByDay: { date: string; revenue: number }[];
};

type Tab = 'applications' | 'listings' | 'commissions' | 'analytics';

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminMarketplacePage() {
  const t = useT();
  useDocumentTitle(t("إدارة السوق"));
  const [tab, setTab] = useState<Tab>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [appStatus, setAppStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [newCommCategory, setNewCommCategory] = useState('');
  const [newCommRate, setNewCommRate] = useState('');

  async function load(t: Tab = tab) {
    setLoading(true);
    try {
      if (t === 'applications') {
        const r = await apiFetch<{ success: boolean; data: Application[] }>(`/api/marketplace/admin/applications?status=${appStatus}`);
        setApplications(r.data ?? []);
      } else if (t === 'listings') {
        const r = await apiFetch<{ success: boolean; data: Listing[] }>('/api/marketplace/admin/listings');
        setListings(r.data ?? []);
      } else if (t === 'commissions') {
        const r = await apiFetch<{ success: boolean; data: Commission[] }>('/api/marketplace/admin/commissions');
        setCommissions(r.data ?? []);
      } else if (t === 'analytics') {
        const r = await apiFetch<{ success: boolean; data: Analytics }>('/api/marketplace/admin/analytics');
        setAnalytics(r.data);
      }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { load(tab); }, [tab, appStatus]);

  async function handleApprove(id: string) {
    await apiFetch(`/api/marketplace/admin/applications/${id}/approve`, { method: 'POST' });
    load();
  }

  async function handleReject(id: string) {
    const reason = window.prompt(t("سبب الرفض (اختياري):"));
    await apiFetch(`/api/marketplace/admin/applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    load();
  }

  async function toggleFeatured(listing: Listing) {
    await apiFetch(`/api/marketplace/admin/listings/${listing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isFeatured: !listing.isFeatured }),
    });
    load();
  }

  async function toggleListingStatus(listing: Listing) {
    const newStatus = listing.approvalStatus === 'approved' ? 'rejected' : 'approved';
    await apiFetch(`/api/marketplace/admin/listings/${listing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ approvalStatus: newStatus }),
    });
    load();
  }

  async function saveCommission() {
    if (!newCommCategory || !newCommRate) return;
    await apiFetch(`/api/marketplace/admin/commissions/${encodeURIComponent(newCommCategory)}`, {
      method: 'PUT',
      body: JSON.stringify({ commissionRate: Number(newCommRate) }),
    });
    setNewCommCategory('');
    setNewCommRate('');
    load();
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'applications', label: t("طلبات الانضمام"), icon: Store },
    { key: 'listings', label: t("المنتجات"), icon: Package },
    { key: 'commissions', label: t("العمولات"), icon: DollarSign },
    { key: 'analytics', label: t("الإحصائيات"), icon: BarChart2 },
  ];

  return (
    <div style={{ padding: 32 }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0B3550', margin: 0 }}>{t("إدارة السوق الموحد")}</h1>
        <p style={{ fontSize: 13, color: '#5B6B7B', margin: '4px 0 0' }}>{t("مراجعة الطلبات والمنتجات وضبط العمولات")}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E6ECF1' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', borderBottom: tab === t.key ? '2px solid #20A9F4' : '2px solid transparent', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, color: tab === t.key ? '#20A9F4' : '#5B6B7B', transition: 'all .15s' }}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Applications */}
      {tab === 'applications' && (
        <div>
          <div className="flex gap-2 mb-4">
            {(['pending', 'approved', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setAppStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  appStatus === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={appStatus === s ? { background: '#0B3550' } : {}}>
                {s === 'pending' ? t("قيد الانتظار") : s === 'approved' ? t("مُعتمد") : t("مرفوض")}
              </button>
            ))}
            <button onClick={() => load()} className="mr-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">{t("لا توجد طلبات")}</div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app.id} className="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 p-4">
                  {app.logo
                    ? <img src={app.logo} className="h-12 w-12 rounded-xl object-cover" alt="" />
                    : <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: '#0B3550' }}>
                        <Store className="h-6 w-6 text-white" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{app.storeName}</p>
                    <p className="text-xs text-gray-400">{app.merchantName} • {app.merchantEmail}</p>
                  </div>
                  {appStatus === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(app.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100">
                        <CheckCircle className="h-3.5 w-3.5" /> {' '}{t("قبول")}
                      </button>
                      <button onClick={() => handleReject(app.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">
                        <XCircle className="h-3.5 w-3.5" /> {' '}{t("رفض")}
                      </button>
                    </div>
                  )}
                  {appStatus !== 'pending' && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      appStatus === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {appStatus === 'approved' ? t("مُعتمد") : t("مرفوض")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listings */}
      {tab === 'listings' && (
        <div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-right">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("المنتج")}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("المتجر")}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("السعر")}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("الحالة")}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("إجراءات")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map(l => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {l.images?.[0] ? <img src={l.images[0]} className="h-8 w-8 rounded object-cover" alt="" /> : <Package className="h-8 w-8 text-gray-200" />}
                          <span className="font-medium text-gray-800 truncate max-w-[150px]">{l.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{l.storeName}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {formatCurrency(l.marketplacePrice ?? l.originalPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          l.approvalStatus === 'approved' ? 'bg-green-50 text-green-600' :
                          l.approvalStatus === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-500'
                        }`}>
                          {l.approvalStatus === 'approved' ? t("مُعتمد") : l.approvalStatus === 'pending' ? t("قيد المراجعة") : t("مرفوض")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleFeatured(l)} title={l.isFeatured ? t("إلغاء التمييز") : t("تمييز")}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition ${l.isFeatured ? 'bg-yellow-50 text-yellow-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                            {l.isFeatured ? <Star className="h-3.5 w-3.5" /> : <StarOff className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => toggleListingStatus(l)}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition ${
                              l.approvalStatus === 'approved' ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-green-50 text-gray-400 hover:text-green-500'
                            }`}>
                            {l.approvalStatus === 'approved' ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Commissions */}
      {tab === 'commissions' && (
        <div className="max-w-lg">
          <p className="text-sm text-gray-500 mb-4">{t("حدد نسبة عمولة المنصة لكل فئة من المنتجات. استخدم")}{' '}<strong>all</strong> {' '}{t("للعمولة العامة.")}</p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            {commissions.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">{t("لا توجد قواعد عمولة")}</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-right">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("الفئة")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("النسبة")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {commissions.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium">{c.categoryTag}</td>
                      <td className="px-4 py-3">{c.commissionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" /> {' '}{t("إضافة / تعديل عمولة")}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("الفئة")}</label>
                <input value={newCommCategory} onChange={e => setNewCommCategory(e.target.value)}
                  placeholder={t("all أو إلكترونيات...")} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("النسبة %")}</label>
                <input value={newCommRate} onChange={e => setNewCommRate(e.target.value)}
                  type="number" min={0} max={100} placeholder="10"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
            </div>
            <button onClick={saveCommission}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: '#0B3550' }}>
              
              {t("حفظ")}
            </button>
          </div>
        </div>
      )}

      {/* Analytics */}
      {tab === 'analytics' && analytics && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: t("إجمالي الطلبات"), value: analytics.totalOrders, icon: ShoppingCart, fmt: (v: number) => v.toLocaleString('en') },
              { label: t("إجمالي الإيرادات"), value: analytics.totalRevenue, icon: TrendingUp, fmt: formatCurrency },
              { label: t("عدد العملاء"), value: analytics.uniqueCustomers, icon: Store, fmt: (v: number) => v.toLocaleString('en') },
              { label: t("متوسط قيمة الطلب"), value: analytics.avgOrderValue, icon: BarChart2, fmt: formatCurrency },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{card.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-800">{card.fmt(card.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{t("إيرادات آخر 30 يوم")}</h3>
            {analytics.revenueByDay.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">{t("لا توجد بيانات")}</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {analytics.revenueByDay.map((d, i) => {
                  const max = Math.max(...analytics.revenueByDay.map(x => x.revenue));
                  const pct = max > 0 ? (d.revenue / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1 hidden group-hover:block text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap z-10">
                        {formatCurrency(d.revenue)}
                      </div>
                      <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(2, pct)}%`, background: '#0B3550' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
