'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Copy, Tag, Loader2, X, ToggleLeft, ToggleRight, Zap,
  TrendingUp, Instagram, Youtube, Twitter, Link2, DollarSign, ShoppingBag,
  Pencil, ChevronDown, ChevronRight, Handshake, Users, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CouponPublic, AffiliatePublic } from '@storebuilder/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, getFeatureLimit, Plan, PLAN_LABELS } from '@/lib/plan-features';
import { PlanGate } from '@/components/ui/PlanGate';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', border: '#FBE1EA', bg: '#F5EFFA' };

type TabKey = 'coupons' | 'affiliates';

// ─── Coupons ─────────────────────────────────────────────────────────────────

interface CouponForm {
  code: string; discountType: 'percent' | 'fixed';
  discountValue: string; minOrderAmount: string; maxUses: string; expiresAt: string;
}
const emptyCouponForm: CouponForm = {
  code: '', discountType: 'percent', discountValue: '', minOrderAmount: '', maxUses: '', expiresAt: '',
};

function CouponsTab() {
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const couponLimit = getFeatureLimit(plan, 'coupons');
  const [coupons, setCoupons] = useState<CouponPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyCouponForm);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: CouponPublic[] }>('/api/coupons');
      setCoupons(res.data ?? []);
    } catch { toast.error('فشل تحميل الكوبونات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/api/coupons', {
        code: form.code.toUpperCase().trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success('تم إنشاء الكوبون ✓');
      setShowModal(false); setForm(emptyCouponForm); fetchCoupons();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const toggleCoupon = async (c: CouponPublic) => {
    try {
      await api.patch(`/api/coupons/${c.id}`, { isActive: !c.isActive });
      fetchCoupons();
    } catch { toast.error('فشل التحديث'); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try { await api.delete(`/api/coupons/${id}`); toast.success('تم الحذف'); fetchCoupons(); }
    catch { toast.error('فشل الحذف'); }
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success(`تم نسخ الكود: ${code}`); };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    setForm(f => ({ ...f, code: Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }));
  };

  const atLimit = couponLimit !== null && couponLimit !== undefined && coupons.length >= (couponLimit ?? 0);
  const totalSavings = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div>
      {couponLimit !== null && couponLimit !== undefined && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 border"
          style={{ background: atLimit ? '#FEF2F2' : '#FEF3C7', borderColor: atLimit ? '#FECACA' : '#FCD34D' }}>
          <Zap className="h-4 w-4 flex-shrink-0" style={{ color: atLimit ? '#DC2626' : '#D97706' }} />
          <p className="text-sm flex-1" style={{ color: atLimit ? '#991B1B' : '#92400E' }}>
            {couponLimit === 0
              ? 'أكواد الخصم غير متاحة في الخطة المجانية'
              : `خطة ${PLAN_LABELS[plan]}: ${coupons.length} / ${couponLimit} كوبون`}
            {atLimit && ' — ارفع خطتك للمزيد'}
          </p>
          {atLimit && <a href="/dashboard/upgrade" className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: '#DB6E93' }}>ارفع الآن</a>}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{coupons.length} كوبون • {totalSavings} استخدام إجمالي</p>
        <button onClick={() => { setForm(emptyCouponForm); setShowModal(true); }} disabled={atLimit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> إنشاء كوبون
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي الكوبونات', value: coupons.length, color: BRAND.primary },
          { label: 'كوبونات نشطة', value: coupons.filter(c => c.isActive).length, color: '#10b981' },
          { label: 'إجمالي الاستخدامات', value: totalSavings, color: BRAND.accent },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: BRAND.border }}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: BRAND.border }}>
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد كوبونات بعد</p>
          <p className="text-sm text-gray-400 mb-6">أنشئ كوبون خصم لتشجيع العملاء على الشراء</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>إنشاء أول كوبون</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BRAND.border }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: '#F5EFFA' }}>
              <tr>{['الكود', 'الخصم', 'الحد الأدنى', 'الاستخدام', 'الانتهاء', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} className="px-4 py-3 text-right font-semibold" style={{ color: BRAND.primary }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFFA]">
              {coupons.map(c => {
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const isExhausted = c.maxUses && c.usedCount >= c.maxUses;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2.5 py-1 rounded-lg text-sm" style={{ background: `${BRAND.primary}10`, color: BRAND.primary }}>{c.code}</span>
                        <button onClick={() => copyCode(c.code)} className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="font-bold" style={{ color: BRAND.accent }}>{c.discountType === 'percent' ? `${c.discountValue}%` : `${c.discountValue} د.ع`}</span></td>
                    <td className="px-4 py-3 text-gray-500">{c.minOrderAmount ? `${c.minOrderAmount} د.ع` : '—'}</td>
                    <td className="px-4 py-3"><span style={{ color: isExhausted ? '#ef4444' : 'inherit' }}>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</span></td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.expiresAt ? <span style={{ color: isExpired ? '#ef4444' : 'inherit' }}>{isExpired ? 'منتهي' : formatDate(c.expiresAt)}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: c.isActive && !isExpired && !isExhausted ? '#d1fae5' : '#F5EFFA', color: c.isActive && !isExpired && !isExhausted ? '#065f46' : '#6b7280' }}>
                        {isExpired ? 'منتهي' : isExhausted ? 'مستنفد' : c.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleCoupon(c)}>{c.isActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}</button>
                        <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BRAND.border }}>
              <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>إنشاء كوبون خصم</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>كود الخصم *</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                    placeholder="مثال: WELCOME20" className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none font-mono" style={{ borderColor: BRAND.border }} />
                  <button type="button" onClick={generateCode} className="px-3 py-2.5 rounded-xl border text-xs font-medium hover:bg-gray-50" style={{ borderColor: BRAND.border }}>عشوائي</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: BRAND.primary }}>نوع الخصم</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['percent', 'fixed'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, discountType: t }))}
                      className="p-3 rounded-xl border-2 text-sm font-medium transition"
                      style={{ borderColor: form.discountType === t ? BRAND.accent : BRAND.border, background: form.discountType === t ? `${BRAND.accent}10` : 'white', color: form.discountType === t ? BRAND.accent : '#374151' }}>
                      {t === 'percent' ? 'نسبة مئوية %' : 'مبلغ ثابت د.ع'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>قيمة الخصم *</label>
                  <input type="number" min="0" step="0.01" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} required
                    placeholder={form.discountType === 'percent' ? '20' : '5000'}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الحد الأدنى للطلب</label>
                  <input type="number" min="0" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                    placeholder="اختياري" className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>عدد الاستخدامات</label>
                  <input type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="غير محدود" className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>تاريخ الانتهاء</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600" style={{ borderColor: BRAND.border }}>إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'جارٍ الحفظ…' : 'إنشاء الكوبون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Affiliates ───────────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { value: 'tiktok',    label: 'TikTok',    icon: Link2,      color: '#000000' },
  { value: 'youtube',   label: 'YouTube',   icon: Youtube,    color: '#FF0000' },
  { value: 'twitter',   label: 'Twitter/X', icon: Twitter,    color: '#1DA1F2' },
  { value: 'snapchat',  label: 'Snapchat',  icon: Link2,      color: '#FFFC00' },
  { value: 'other',     label: 'أخرى',      icon: Link2,      color: '#6b7280' },
];

interface AffiliateForm {
  name: string; email: string; phone: string; platform: string; handle: string;
  followerCount: string; commissionType: 'percent' | 'fixed'; commissionRate: string; notes: string;
}
const emptyAffForm: AffiliateForm = {
  name: '', email: '', phone: '', platform: 'instagram', handle: '',
  followerCount: '', commissionType: 'percent', commissionRate: '10', notes: '',
};

interface AffCouponForm {
  code: string; label: string; discountType: 'percent' | 'fixed';
  discountValue: string; minOrderAmount: string; maxUses: string; expiresAt: string;
}
const emptyAffCoupon: AffCouponForm = { code: '', label: '', discountType: 'percent', discountValue: '10', minOrderAmount: '', maxUses: '', expiresAt: '' };

function PlatformIcon({ platform, size = 16 }: { platform?: string | null; size?: number }) {
  const p = PLATFORMS.find(pl => pl.value === platform);
  if (!p) return <Link2 size={size} className="text-gray-400" />;
  const Icon = p.icon;
  return <Icon size={size} style={{ color: p.color }} />;
}

function AffiliatesTab() {
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const [affiliates, setAffiliates] = useState<AffiliatePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AffiliateForm>(emptyAffForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCouponModal, setShowCouponModal] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState<AffCouponForm>(emptyAffCoupon);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: AffiliatePublic[] }>('/api/affiliates');
      setAffiliates(res.data ?? []);
    } catch { toast.error('فشل تحميل المؤثرين'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAffiliates(); }, [fetchAffiliates]);

  if (!canUseFeature(plan, 'affiliates')) return <div className="py-8"><PlanGate feature="affiliates" /></div>;

  const openNew = () => { setEditingId(null); setForm(emptyAffForm); setShowModal(true); };
  const openEdit = (a: AffiliatePublic) => {
    setEditingId(a.id);
    setForm({ name: a.name, email: a.email ?? '', phone: a.phone ?? '', platform: a.platform ?? 'instagram',
      handle: a.handle ?? '', followerCount: a.followerCount ? String(a.followerCount) : '',
      commissionType: a.commissionType, commissionRate: String(a.commissionRate), notes: a.notes ?? '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const body = { name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        platform: form.platform, handle: form.handle || undefined,
        followerCount: form.followerCount ? Number(form.followerCount) : undefined,
        commissionType: form.commissionType, commissionRate: Number(form.commissionRate), notes: form.notes || undefined };
      if (editingId) { await api.patch(`/api/affiliates/${editingId}`, body); toast.success('تم التحديث'); }
      else { const res = await api.post<{ success: boolean; data: AffiliatePublic }>('/api/affiliates', body); setAffiliates(p => [res.data, ...p]); toast.success('تمت إضافة المؤثر'); }
      setShowModal(false); fetchAffiliates();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('سيتم حذف المؤثر وجميع كوباتاته. هل تريد المتابعة؟')) return;
    try { await api.delete(`/api/affiliates/${id}`); setAffiliates(p => p.filter(a => a.id !== id)); toast.success('تم الحذف'); }
    catch { toast.error('فشل الحذف'); }
  };

  const handleToggle = async (a: AffiliatePublic) => {
    try { await api.patch(`/api/affiliates/${a.id}`, { isActive: !a.isActive }); setAffiliates(p => p.map(af => af.id === a.id ? { ...af, isActive: !af.isActive } : af)); }
    catch { toast.error('فشل التحديث'); }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showCouponModal) return; setSavingCoupon(true);
    try {
      await api.post(`/api/affiliates/${showCouponModal}/coupon`, {
        code: couponForm.code.toUpperCase(), label: couponForm.label || undefined,
        discountType: couponForm.discountType, discountValue: Number(couponForm.discountValue),
        minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : undefined,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
        expiresAt: couponForm.expiresAt || undefined,
      });
      toast.success('تم إنشاء كود الخصم'); setShowCouponModal(null); setCouponForm(emptyAffCoupon); fetchAffiliates();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل إنشاء الكود'); }
    finally { setSavingCoupon(false); }
  };

  const totalEarned = affiliates.reduce((s, a) => s + Number(a.totalEarned ?? 0), 0);
  const totalOrders = affiliates.reduce((s, a) => s + Number(a.totalOrders ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{affiliates.filter(a => a.isActive).length} مؤثر نشط</p>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> إضافة مؤثر
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي المؤثرين', value: affiliates.length, icon: TrendingUp, color: BRAND.secondary },
          { label: 'طلبات من المؤثرين', value: `${totalOrders} طلب`, icon: ShoppingBag, color: BRAND.accent },
          { label: 'عمولات مستحقة', value: formatCurrency(totalEarned), icon: DollarSign, color: '#059669' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border" style={{ borderColor: BRAND.border }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className="text-xl font-bold" style={{ color: BRAND.primary }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : affiliates.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: BRAND.border }}>
          <div className="mb-3 flex justify-center"><Handshake size={48} style={{ color: BRAND.accent }} /></div>
          <p className="text-gray-400 mb-2">لا يوجد مؤثرون بعد</p>
          <button onClick={openNew} className="text-sm font-medium" style={{ color: BRAND.accent }}>+ أضف أول مؤثر</button>
        </div>
      ) : (
        <div className="space-y-3">
          {affiliates.map(aff => (
            <div key={aff.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center gap-4 p-4">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: aff.isActive ? `linear-gradient(135deg,${BRAND.primary},${BRAND.accent})` : '#9ca3af' }}>
                    {aff.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                    <PlatformIcon platform={aff.platform} size={12} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold" style={{ color: BRAND.primary }}>{aff.name}</p>
                    {aff.handle && <span className="text-xs text-gray-400">@{aff.handle}</span>}
                    {!aff.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">معطّل</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {aff.email && <span>{aff.email}</span>}
                    {aff.followerCount && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {aff.followerCount.toLocaleString('ar')}</span>}
                    {aff.couponCode && <span className="flex items-center gap-1" style={{ color: BRAND.secondary }}><Tag className="h-3 w-3" />{aff.couponCode}</span>}
                  </div>
                </div>
                <div className="text-center px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#F5EFFA' }}>
                  <p className="text-lg font-bold" style={{ color: BRAND.accent }}>
                    {aff.commissionType === 'percent' ? `${aff.commissionRate}%` : formatCurrency(aff.commissionRate)}
                  </p>
                  <p className="text-xs text-gray-400">عمولة</p>
                </div>
                <div className="text-center px-3 flex-shrink-0">
                  <p className="font-bold" style={{ color: BRAND.primary }}>{aff.totalOrders}</p>
                  <p className="text-xs text-gray-400">طلب</p>
                </div>
                <div className="text-center px-3 flex-shrink-0">
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(aff.totalEarned))}</p>
                  <p className="text-xs text-gray-400">عمولة</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setShowCouponModal(aff.id); setCouponForm({ ...emptyAffCoupon, code: aff.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,6) + Math.floor(Math.random()*90+10) }); }}
                    className="p-1.5 rounded-lg hover:bg-purple-50 transition" style={{ color: BRAND.secondary }} title="إنشاء كود خصم">
                    <Tag className="h-4 w-4" />
                  </button>
                  <button onClick={() => openEdit(aff)} className="p-1.5 rounded-lg hover:bg-purple-50 transition" style={{ color: BRAND.secondary }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleToggle(aff)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                    {aff.isActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                  </button>
                  <button onClick={() => handleDelete(aff.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === aff.id ? null : aff.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                    {expandedId === aff.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {expandedId === aff.id && aff.notes && (
                <div className="px-4 pb-4"><div className="rounded-xl p-3 text-xs text-gray-600" style={{ background: '#F5EFFA' }}>
                  <p className="font-semibold mb-1" style={{ color: BRAND.secondary }}>ملاحظات</p><p>{aff.notes}</p>
                </div></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BRAND.border }}>
              <h2 className="font-bold text-lg" style={{ color: BRAND.primary }}>{editingId ? 'تعديل المؤثر' : 'إضافة مؤثر جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الاسم *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="اسم المؤثر"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>المنصة</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none bg-white" style={{ borderColor: BRAND.border }}>
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>@الحساب</label>
                  <input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} placeholder="@username"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>المتابعون</label>
                  <input type="number" min="0" value={form.followerCount} onChange={e => setForm(f => ({ ...f, followerCount: e.target.value }))} placeholder="50000"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+9647..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: BRAND.primary }}>نوع العمولة</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(['percent', 'fixed'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, commissionType: t }))}
                      className="p-3 rounded-xl border-2 transition"
                      style={{ borderColor: form.commissionType === t ? BRAND.accent : BRAND.border, background: form.commissionType === t ? `${BRAND.accent}10` : 'white' }}>
                      <p className="text-sm font-bold" style={{ color: form.commissionType === t ? BRAND.accent : '#374151' }}>{t === 'percent' ? 'نسبة مئوية %' : 'مبلغ ثابت د.ع'}</p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="0.01" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                  <span className="text-sm text-gray-500">{form.commissionType === 'percent' ? '%' : 'د.ع'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-none" style={{ borderColor: BRAND.border }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600" style={{ borderColor: BRAND.border }}>إلغاء</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'جارٍ الحفظ…' : editingId ? 'حفظ التغييرات' : 'إضافة المؤثر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BRAND.border }}>
              <h2 className="font-bold text-lg" style={{ color: BRAND.primary }}>إنشاء كود خصم للمؤثر</h2>
              <button onClick={() => setShowCouponModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>كود الخصم *</label>
                <input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none" style={{ borderColor: BRAND.border }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>نوع الخصم</label>
                  <select value={couponForm.discountType} onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none" style={{ borderColor: BRAND.border }}>
                    <option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>القيمة *</label>
                  <input type="number" min="0" step="0.01" value={couponForm.discountValue} onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))} required
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCouponModal(null)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-600" style={{ borderColor: BRAND.border }}>إلغاء</button>
                <button type="submit" disabled={savingCoupon} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {savingCoupon && <Loader2 className="h-4 w-4 animate-spin" />}{savingCoupon ? 'جارٍ الإنشاء…' : 'إنشاء الكود'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'coupons',   label: 'كوبونات الخصم',       icon: Tag },
  { key: 'affiliates', label: 'المسوقون بالعمولة', icon: Handshake },
];

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function MarketingPage() {
  useDocumentTitle('التسويق');
  const [tab, setTab] = useState<TabKey>('coupons');

  return (
    <div className="p-6 max-w-5xl" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>التسويق</h1>
        <p className="text-sm text-gray-500 mt-0.5">كوبونات الخصم والمسوقون بالعمولة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: BRAND.border }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition -mb-px"
            style={{ borderBottomColor: tab === t.key ? BRAND.accent : 'transparent', color: tab === t.key ? BRAND.accent : '#9ca3af' }}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'coupons' && <CouponsTab />}
      {tab === 'affiliates' && <AffiliatesTab />}
    </div>
  );
}
