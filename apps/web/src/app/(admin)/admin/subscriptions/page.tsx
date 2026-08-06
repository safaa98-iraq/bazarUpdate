'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Crown, Zap, Globe, Users, TrendingUp, Calendar, AlertTriangle,
  CheckCircle2, XCircle, ChevronDown, Search, RefreshCw, Loader2,
  ArrowUpCircle, ArrowDownCircle, Clock, Phone,
} from 'lucide-react';
import { PLAN_CONFIGS } from '@storebuilder/types';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#F5EFFA', border: '#FBE1EA' };

const PLAN_META = {
  FREE:       { label: PLAN_CONFIGS.FREE.nameAr,        color: '#6B7280', bg: '#F3F4F6', icon: Globe,  iconColor: '#6B7280' },
  PRO:        { label: PLAN_CONFIGS.PRO.nameAr,         color: '#7C3AED', bg: '#EDE9FE', icon: Zap,    iconColor: '#7C3AED' },
  ENTERPRISE: { label: PLAN_CONFIGS.ENTERPRISE.nameAr,   color: '#D97706', bg: '#FEF3C7', icon: Crown,  iconColor: '#D97706' },
};

interface Subscription {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  isActive: boolean;
  joinedAt: string;
  planChangedAt: string | null;
  planExpiry: string | null;
  daysLeft: number | null;
  hasPendingRequest: boolean;
  lastPayment: { amount: number; currency: string; reviewedAt: string } | null;
}

function PlanBadge({ plan }: { plan: 'FREE' | 'PRO' | 'ENTERPRISE' }) {
  const m = PLAN_META[plan];
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: m.bg, color: m.color }}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function DaysChip({ days, plan }: { days: number | null; plan: string }) {
  if (plan === 'FREE' || days === null) return <span className="text-xs text-gray-400">—</span>;
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
      <XCircle className="h-3 w-3" /> منتهي
    </span>
  );
  if (days <= 7) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <AlertTriangle className="h-3 w-3" /> {days} يوم
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> {days} يوم
    </span>
  );
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ConfirmModal({
  open, title, message, confirmLabel, danger,
  onConfirm, onClose, loading,
}: {
  open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold mb-2" style={{ color: B.p }}>{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50 transition"
            style={{ borderColor: B.border }}>إلغاء</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: danger ? '#EF4444' : `linear-gradient(135deg, ${B.p}, ${B.a})` }}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function SubscriptionsPage() {
  useDocumentTitle('الاشتراكات');
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'ENTERPRISE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{
    open: boolean; userId: string; name: string;
    targetPlan: 'FREE' | 'PRO' | 'ENTERPRISE'; current: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ success: boolean; data: Subscription[] }>('/api/billing/admin/subscriptions');
      setData(r.data ?? []);
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyPlan = async (userId: string, plan: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    setActionLoading(userId);
    try {
      await api.patch(`/api/billing/admin/subscriptions/${userId}`, { plan });
      toast.success('تم تغيير الخطة بنجاح');
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل التغيير');
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  // KPIs
  const total = data.length;
  const proCount = data.filter(d => d.plan === 'PRO').length;
  const entCount = data.filter(d => d.plan === 'ENTERPRISE').length;
  const expiring = data.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7).length;
  const expired = data.filter(d => d.daysLeft !== null && d.daysLeft < 0).length;

  const filtered = data.filter(d => {
    const matchPlan = planFilter === 'ALL' || d.plan === planFilter;
    const matchStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'EXPIRING' ? (d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7) :
      (d.daysLeft !== null && d.daysLeft < 0);
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q)
      || (d.whatsapp ?? '').includes(q);
    return matchPlan && matchStatus && matchSearch;
  });

  const planUpgrade = (plan: 'FREE' | 'PRO' | 'ENTERPRISE'): 'FREE' | 'PRO' | 'ENTERPRISE' | null =>
    plan === 'FREE' ? 'PRO' : plan === 'PRO' ? 'ENTERPRISE' : null;
  const planDowngrade = (plan: 'FREE' | 'PRO' | 'ENTERPRISE'): 'FREE' | 'PRO' | 'ENTERPRISE' | null =>
    plan === 'ENTERPRISE' ? 'PRO' : plan === 'PRO' ? 'FREE' : null;

  return (
    <div className="p-6 max-w-7xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: B.p }}>إدارة الاشتراكات</h1>
          <p className="text-sm text-gray-500 mt-0.5">تواريخ الاشتراك، ترقية وإلغاء الخطط</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          style={{ borderColor: B.border }}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: B.p }} />
          تحديث
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'إجمالي التجار', value: total, icon: Users, color: B.p, bg: '#F0E7F8' },
          { label: 'خطة احترافية', value: proCount, icon: Zap, color: '#7C3AED', bg: '#EDE9FE' },
          { label: 'خطة أعمال', value: entCount, icon: Crown, color: '#D97706', bg: '#FEF3C7' },
          { label: 'تنتهي خلال 7 أيام', value: expiring, icon: Clock, color: '#F59E0B', bg: '#FEF9C3' },
          { label: 'منتهية الصلاحية', value: expired, icon: AlertTriangle, color: '#EF4444', bg: '#FEE2E2' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border" style={{ borderColor: B.border }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color: B.p }}>{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد أو رقم الهاتف…"
            className="w-full pr-9 pl-4 py-2 rounded-xl border text-sm focus:outline-none bg-white"
            style={{ borderColor: B.border }} />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'FREE', 'PRO', 'ENTERPRISE'] as const).map(p => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
              style={{
                borderColor: planFilter === p ? B.a : B.border,
                background: planFilter === p ? B.a : 'white',
                color: planFilter === p ? '#fff' : '#6B7280',
              }}>
              {p === 'ALL' ? 'الكل' : PLAN_META[p].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {([['ALL', 'الكل'], ['EXPIRING', 'تنتهي قريباً'], ['EXPIRED', 'منتهية']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
              style={{
                borderColor: statusFilter === v ? B.p : B.border,
                background: statusFilter === v ? B.p : 'white',
                color: statusFilter === v ? '#fff' : '#6B7280',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: B.a }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: B.border }}>
          <table className="w-full text-sm">
            <thead style={{ background: B.soft }}>
              <tr>
                {['التاجر', 'الخطة', 'تاريخ التسجيل', 'بداية الاشتراك', 'انتهاء الاشتراك', 'المتبقي', 'الإجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-bold" style={{ color: B.p }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#F5EFFA' }}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                    لا توجد نتائج مطابقة
                  </td>
                </tr>
              ) : filtered.map(row => {
                const upgrade = planUpgrade(row.plan);
                const downgrade = planDowngrade(row.plan);
                const isLoading = actionLoading === row.id;

                return (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition">
                    {/* Merchant */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${B.p}, ${B.a})` }}>
                          {row.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{row.name}</p>
                          <p className="text-xs text-gray-400 truncate">{row.email}</p>
                          {row.whatsapp && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" />{row.whatsapp}
                            </p>
                          )}
                        </div>
                      </div>
                      {!row.isActive && (
                        <span className="mt-1 inline-block text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">موقوف</span>
                      )}
                      {row.hasPendingRequest && (
                        <span className="mt-1 inline-block text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 mr-1">طلب معلق</span>
                      )}
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <PlanBadge plan={row.plan} />
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{fmt(row.joinedAt)}</span>
                    </td>

                    {/* Plan start */}
                    <td className="px-4 py-3">
                      {row.plan === 'FREE' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-700">{fmt(row.planChangedAt)}</p>
                          {row.lastPayment && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {Number(row.lastPayment.amount).toLocaleString('ar')} {row.lastPayment.currency}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3">
                      {row.plan === 'FREE' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <span className="text-xs" style={{ color: (row.daysLeft ?? 1) <= 0 ? '#EF4444' : (row.daysLeft ?? 99) <= 7 ? '#F59E0B' : '#374151' }}>
                          {fmt(row.planExpiry)}
                        </span>
                      )}
                    </td>

                    {/* Days left */}
                    <td className="px-4 py-3">
                      <DaysChip days={row.daysLeft} plan={row.plan} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {upgrade && (
                          <button
                            onClick={() => setConfirm({ open: true, userId: row.id, name: row.name, targetPlan: upgrade, current: row.plan })}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: `${PLAN_META[upgrade].bg}`, color: PLAN_META[upgrade].color }}
                            title={`ترقية إلى ${PLAN_META[upgrade].label}`}>
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                            {PLAN_META[upgrade].label}
                          </button>
                        )}
                        {downgrade && (
                          <button
                            onClick={() => setConfirm({ open: true, userId: row.id, name: row.name, targetPlan: downgrade, current: row.plan })}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                            style={{ background: '#FEE2E2', color: '#991B1B' }}
                            title={`تخفيض إلى ${PLAN_META[downgrade].label}`}>
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
                            {downgrade === 'FREE' ? 'إلغاء' : PLAN_META[downgrade].label}
                          </button>
                        )}
                        {row.plan === 'FREE' && !upgrade && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t text-xs text-gray-400" style={{ borderColor: B.border }}>
              عرض {filtered.length} من أصل {data.length} تاجر
            </div>
          )}
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        open={confirm?.open ?? false}
        title={confirm ? `${confirm.targetPlan === 'FREE' ? 'إلغاء الاشتراك' : 'تغيير الخطة'}` : ''}
        message={confirm
          ? confirm.targetPlan === 'FREE'
            ? `سيتم إلغاء اشتراك "${confirm.name}" وتحويله إلى الخطة المجانية فوراً. هل أنت متأكد؟`
            : `سيتم ترقية "${confirm.name}" من خطة ${PLAN_META[confirm.current as keyof typeof PLAN_META]?.label ?? confirm.current} إلى خطة ${PLAN_META[confirm.targetPlan].label} فوراً.`
          : ''}
        confirmLabel={confirm?.targetPlan === 'FREE' ? 'إلغاء الاشتراك' : 'تأكيد الترقية'}
        danger={confirm?.targetPlan === 'FREE'}
        onConfirm={() => confirm && applyPlan(confirm.userId, confirm.targetPlan)}
        onClose={() => setConfirm(null)}
        loading={actionLoading !== null}
      />
    </div>
  );
}
