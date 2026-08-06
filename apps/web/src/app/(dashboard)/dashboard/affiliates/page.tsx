'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Plus, Trash2, Pencil, ToggleLeft, ToggleRight, Loader2, X,
  Instagram, Youtube, Twitter, Link2, DollarSign, ShoppingBag, ChevronDown, ChevronRight, Tag,
  Handshake, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AffiliatePublic } from '@storebuilder/types';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PlanGate } from '@/components/ui/PlanGate';
import { canUseFeature, Plan } from '@/lib/plan-features';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { value: 'tiktok',    label: 'TikTok',    icon: Link2,      color: '#000000' },
  { value: 'youtube',   label: 'YouTube',   icon: Youtube,    color: '#FF0000' },
  { value: 'twitter',   label: 'Twitter/X', icon: Twitter,    color: '#1DA1F2' },
  { value: 'snapchat',  label: 'Snapchat',  icon: Link2,      color: '#FFFC00' },
  { value: 'other',     label: 'أخرى',      icon: Link2,      color: '#6b7280' },
];

interface CouponForm {
  code: string; label: string; discountType: 'percent' | 'fixed';
  discountValue: string; minOrderAmount: string; maxUses: string; expiresAt: string;
}

const emptyCouponForm: CouponForm = {
  code: '', label: '', discountType: 'percent', discountValue: '10',
  minOrderAmount: '', maxUses: '', expiresAt: '',
};

interface AffiliateForm {
  name: string; email: string; phone: string; platform: string; handle: string;
  followerCount: string; commissionType: 'percent' | 'fixed'; commissionRate: string; notes: string;
}

const emptyForm: AffiliateForm = {
  name: '', email: '', phone: '', platform: 'instagram', handle: '',
  followerCount: '', commissionType: 'percent', commissionRate: '10', notes: '',
};

function PlatformIcon({ platform, size = 16 }: { platform?: string | null; size?: number }) {
  const p = PLATFORMS.find(pl => pl.value === platform);
  if (!p) return <Link2 size={size} className="text-gray-400" />;
  const Icon = p.icon;
  return <Icon size={size} style={{ color: p.color }} />;
}

function generateCode(name: string): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const suffix = Math.floor(Math.random() * 90 + 10);
  return base + suffix;
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AffiliatesPage() {
  useDocumentTitle('المسوقون بالعمولة');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const [affiliates, setAffiliates] = useState<AffiliatePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AffiliateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCouponModal, setShowCouponModal] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const fetchAffiliates = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: AffiliatePublic[] }>('/api/affiliates');
      setAffiliates(res.data ?? []);
    } catch { toast.error('فشل تحميل المؤثرين'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAffiliates(); }, [fetchAffiliates]);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (a: AffiliatePublic) => {
    setEditingId(a.id);
    setForm({
      name: a.name, email: a.email ?? '', phone: a.phone ?? '',
      platform: a.platform ?? 'instagram', handle: a.handle ?? '',
      followerCount: a.followerCount ? String(a.followerCount) : '',
      commissionType: a.commissionType, commissionRate: String(a.commissionRate),
      notes: a.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        platform: form.platform, handle: form.handle || undefined,
        followerCount: form.followerCount ? Number(form.followerCount) : undefined,
        commissionType: form.commissionType, commissionRate: Number(form.commissionRate),
        notes: form.notes || undefined,
      };
      if (editingId) {
        await api.patch(`/api/affiliates/${editingId}`, body);
        toast.success('تم التحديث');
        fetchAffiliates();
      } else {
        const res = await api.post<{ success: boolean; data: AffiliatePublic }>('/api/affiliates', body);
        toast.success('تمت إضافة المؤثر');
        setAffiliates(prev => [res.data, ...prev]);
      }
      setShowModal(false);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (a: AffiliatePublic) => {
    try {
      await api.patch(`/api/affiliates/${a.id}`, { isActive: !a.isActive });
      setAffiliates(prev => prev.map(af => af.id === a.id ? { ...af, isActive: !af.isActive } : af));
    } catch { toast.error('فشل التحديث'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('سيتم حذف المؤثر وجميع كوباتاته. هل تريد المتابعة؟')) return;
    try {
      await api.delete(`/api/affiliates/${id}`);
      setAffiliates(prev => prev.filter(a => a.id !== id));
      toast.success('تم الحذف');
    } catch { toast.error('فشل الحذف'); }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCouponModal) return;
    setSavingCoupon(true);
    try {
      await api.post(`/api/affiliates/${showCouponModal}/coupon`, {
        code: couponForm.code.toUpperCase(),
        label: couponForm.label || undefined,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : undefined,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
        expiresAt: couponForm.expiresAt || undefined,
      });
      toast.success('تم إنشاء كود الخصم');
      setShowCouponModal(null);
      setCouponForm(emptyCouponForm);
      fetchAffiliates();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل إنشاء الكود'); }
    finally { setSavingCoupon(false); }
  };

  const totalEarned = affiliates.reduce((s, a) => s + Number(a.totalEarned ?? 0), 0);
  const totalOrders = affiliates.reduce((s, a) => s + Number(a.totalOrders ?? 0), 0);
  const activeCount = affiliates.filter(a => a.isActive).length;

  if (!canUseFeature(plan, 'affiliates')) return (
    <div className="p-8"><PlanGate feature="affiliates" /></div>
  );

  return (
    <div className="p-6 max-w-5xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>المؤثرون والتسويق بالعمولة</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} مؤثر نشط</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> إضافة مؤثر
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي المؤثرين', value: affiliates.length, icon: TrendingUp, color: BRAND.secondary },
          { label: 'طلبات من المؤثرين', value: `${totalOrders} طلب`, icon: ShoppingBag, color: BRAND.accent },
          { label: 'عمولات مستحقة', value: formatCurrency(totalEarned), icon: DollarSign, color: '#059669' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#ECE6F0' }}>
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : affiliates.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#ECE6F0' }}>
          <div className="mb-3 flex justify-center"><Handshake size={48} style={{ color: BRAND.accent }} /></div>
          <p className="text-gray-400 mb-2">لا يوجد مؤثرون بعد</p>
          <button onClick={openNew} className="text-sm font-medium" style={{ color: BRAND.accent }}>
            + أضف أول مؤثر
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {affiliates.map(aff => (
            <div key={aff.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar + platform */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: aff.isActive ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` : '#9ca3af' }}>
                    {aff.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                    <PlatformIcon platform={aff.platform} size={12} />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold" style={{ color: BRAND.primary }}>{aff.name}</p>
                    {aff.handle && <span className="text-xs text-gray-400">@{aff.handle}</span>}
                    {!aff.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">معطّل</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    {aff.email && <span>{aff.email}</span>}
                    {aff.followerCount && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {aff.followerCount.toLocaleString('ar')}</span>}
                    {aff.couponCode && (
                      <span className="flex items-center gap-1" style={{ color: BRAND.secondary }}>
                        <Tag className="h-3 w-3" /> {aff.couponCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Commission badge */}
                <div className="text-center px-3 py-2 rounded-xl flex-shrink-0" style={{ background: '#F5EFFA' }}>
                  <p className="text-lg font-bold" style={{ color: BRAND.accent }}>
                    {aff.commissionType === 'percent' ? `${aff.commissionRate}%` : formatCurrency(aff.commissionRate)}
                  </p>
                  <p className="text-xs text-gray-400">عمولة</p>
                </div>

                {/* Stats */}
                <div className="text-center px-3 flex-shrink-0">
                  <p className="font-bold" style={{ color: BRAND.primary }}>{aff.totalOrders}</p>
                  <p className="text-xs text-gray-400">طلب</p>
                </div>
                <div className="text-center px-3 flex-shrink-0">
                  <p className="font-bold text-emerald-600">{formatCurrency(Number(aff.totalEarned))}</p>
                  <p className="text-xs text-gray-400">عمولة</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setShowCouponModal(aff.id)}
                    className="p-1.5 rounded-lg hover:bg-purple-50 transition text-xs font-medium flex items-center gap-1"
                    style={{ color: BRAND.secondary }} title="إنشاء كود خصم">
                    <Tag className="h-4 w-4" />
                  </button>
                  <button onClick={() => openEdit(aff)}
                    className="p-1.5 rounded-lg hover:bg-purple-50 transition" style={{ color: BRAND.secondary }}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleToggle(aff)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                    {aff.isActive
                      ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                      : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                  </button>
                  <button onClick={() => handleDelete(aff.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === aff.id ? null : aff.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                    {expandedId === aff.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded notes */}
              {expandedId === aff.id && aff.notes && (
                <div className="px-4 pb-4 pt-0">
                  <div className="rounded-xl p-3 text-xs text-gray-600" style={{ background: '#F5EFFA' }}>
                    <p className="font-semibold mb-1" style={{ color: BRAND.secondary }}>ملاحظات</p>
                    <p>{aff.notes}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
              <h2 className="font-bold text-lg" style={{ color: BRAND.primary }}>
                {editingId ? 'تعديل المؤثر' : 'إضافة مؤثر جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name + platform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الاسم *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    placeholder="اسم المؤثر"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>المنصة</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none bg-white"
                    style={{ borderColor: '#ECE6F0' }}>
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>@حساب المؤثر</label>
                  <input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))}
                    placeholder="@username"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>عدد المتابعين</label>
                  <input type="number" min="0" value={form.followerCount}
                    onChange={e => setForm(f => ({ ...f, followerCount: e.target.value }))}
                    placeholder="مثال: 50000"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="influencer@email.com"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>رقم الهاتف</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+9647..."
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
              </div>

              {/* Commission */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: BRAND.primary }}>نوع العمولة</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm(f => ({ ...f, commissionType: 'percent' }))}
                    className="p-3 rounded-xl border-2 transition"
                    style={{ borderColor: form.commissionType === 'percent' ? BRAND.accent : '#ECE6F0', background: form.commissionType === 'percent' ? `${BRAND.accent}10` : 'white' }}>
                    <p className="text-sm font-bold" style={{ color: form.commissionType === 'percent' ? BRAND.accent : '#374151' }}>نسبة مئوية %</p>
                    <p className="text-xs text-gray-400">من قيمة الطلب</p>
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, commissionType: 'fixed' }))}
                    className="p-3 rounded-xl border-2 transition"
                    style={{ borderColor: form.commissionType === 'fixed' ? BRAND.accent : '#ECE6F0', background: form.commissionType === 'fixed' ? `${BRAND.accent}10` : 'white' }}>
                    <p className="text-sm font-bold" style={{ color: form.commissionType === 'fixed' ? BRAND.accent : '#374151' }}>مبلغ ثابت د.ع</p>
                    <p className="text-xs text-gray-400">لكل طلب ناجح</p>
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input type="number" min="0" step="0.01" value={form.commissionRate}
                    onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                  <span className="text-sm font-medium text-gray-500">
                    {form.commissionType === 'percent' ? '%' : 'د.ع'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="أي معلومات إضافية عن المؤثر…"
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-none"
                  style={{ borderColor: '#ECE6F0' }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600"
                  style={{ borderColor: '#ECE6F0' }}>إلغاء</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'جارٍ الحفظ…' : editingId ? 'حفظ التغييرات' : 'إضافة المؤثر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon creation modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
              <h2 className="font-bold text-lg" style={{ color: BRAND.primary }}>إنشاء كود خصم للمؤثر</h2>
              <button onClick={() => setShowCouponModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>كود الخصم *</label>
                <div className="flex gap-2">
                  <input value={couponForm.code}
                    onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                    placeholder="مثال: AHMED20"
                    className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-bold uppercase tracking-widest focus:outline-none"
                    style={{ borderColor: '#ECE6F0', color: BRAND.primary, fontFamily: 'monospace' }} />
                  <button type="button"
                    onClick={() => {
                      const aff = affiliates.find(a => a.id === showCouponModal);
                      if (aff) setCouponForm(f => ({ ...f, code: generateCode(aff.name) }));
                    }}
                    className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-purple-50"
                    style={{ borderColor: BRAND.light, color: BRAND.secondary }}>
                    توليد تلقائي
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>تسمية الكود (اختياري)</label>
                <input value={couponForm.label} onChange={e => setCouponForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="مثال: كود خصم أحمد"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ borderColor: '#ECE6F0' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>نوع الخصم</label>
                  <select value={couponForm.discountType}
                    onChange={e => setCouponForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none bg-white"
                    style={{ borderColor: '#ECE6F0' }}>
                    <option value="percent">نسبة %</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>
                    قيمة الخصم {couponForm.discountType === 'percent' ? '%' : 'د.ع'}
                  </label>
                  <input type="number" min="0" step="0.01" value={couponForm.discountValue}
                    onChange={e => setCouponForm(f => ({ ...f, discountValue: e.target.value }))} required
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>الحد الأدنى للطلب (د.ع)</label>
                  <input type="number" min="0" value={couponForm.minOrderAmount}
                    onChange={e => setCouponForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                    placeholder="اختياري"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>تاريخ الانتهاء</label>
                  <input type="date" value={couponForm.expiresAt}
                    onChange={e => setCouponForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: '#ECE6F0' }} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCouponModal(null)}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600"
                  style={{ borderColor: '#ECE6F0' }}>إلغاء</button>
                <button type="submit" disabled={savingCoupon}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {savingCoupon && <Loader2 className="h-4 w-4 animate-spin" />}
                  {savingCoupon ? 'جارٍ الإنشاء…' : 'إنشاء الكود'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
