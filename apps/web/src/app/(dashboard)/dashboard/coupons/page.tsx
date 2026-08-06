'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Copy, Tag, Loader2, X, Check, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CouponPublic } from '@storebuilder/types';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, getFeatureLimit, Plan } from '@/lib/plan-features';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

interface CouponForm {
  code: string; discountType: 'percent' | 'fixed';
  discountValue: string; minOrderAmount: string;
  maxUses: string; expiresAt: string;
}
const emptyForm: CouponForm = {
  code: '', discountType: 'percent', discountValue: '',
  minOrderAmount: '', maxUses: '', expiresAt: '',
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CouponsPage() {
  useDocumentTitle('كوبونات الخصم');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const couponLimit = getFeatureLimit(plan, 'coupons');
  const atLimit = couponLimit !== null && couponLimit !== undefined;
  const [coupons, setCoupons] = useState<CouponPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);

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
      setShowModal(false);
      setForm(emptyForm);
      fetchCoupons();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const toggleCoupon = async (c: CouponPublic) => {
    try {
      await api.patch(`/api/coupons/${c.id}`, { isActive: !c.isActive });
      fetchCoupons();
      toast.success(c.isActive ? 'تم إيقاف الكوبون' : 'تم تفعيل الكوبون');
    } catch { toast.error('فشل التحديث'); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      await api.delete(`/api/coupons/${id}`);
      toast.success('تم الحذف'); fetchCoupons();
    } catch { toast.error('فشل الحذف'); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`تم نسخ الكود: ${code}`);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, code }));
  };

  const totalSavings = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="p-6 max-w-5xl" dir="rtl">
      {/* Plan limit banner */}
      {atLimit && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 border"
          style={{ background: coupons.length >= (couponLimit ?? 0) ? '#FEF2F2' : '#FEF3C7', borderColor: coupons.length >= (couponLimit ?? 0) ? '#FECACA' : '#FCD34D' }}>
          <Zap className="h-4 w-4 flex-shrink-0" style={{ color: coupons.length >= (couponLimit ?? 0) ? '#DC2626' : '#D97706' }} />
          <p className="text-sm flex-1" style={{ color: coupons.length >= (couponLimit ?? 0) ? '#991B1B' : '#92400E' }}>
            {plan === 'FREE' ? 'الخطة المجانية' : 'خطةك الحالية'}: {coupons.length} / {couponLimit} كوبون مستخدم
            {coupons.length >= (couponLimit ?? 0) && ' — ارفع خطتك للمزيد'}
          </p>
          {coupons.length >= (couponLimit ?? 0) && (
            <a href="/dashboard/settings?tab=billing"
              className="text-xs font-bold px-3 py-1.5 rounded-xl text-white transition hover:opacity-90 flex-shrink-0"
              style={{ background: '#DB6E93' }}>ارفع الآن</a>
          )}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>كوبونات الخصم</h1>
          <p className="text-sm text-gray-500 mt-0.5">{coupons.length} كوبون • {totalSavings} استخدام إجمالي</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowModal(true); }}
          disabled={atLimit && coupons.length >= (couponLimit ?? 0)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> إنشاء كوبون
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'إجمالي الكوبونات', value: coupons.length, color: BRAND.primary },
          { label: 'كوبونات نشطة', value: coupons.filter(c => c.isActive).length, color: '#10b981' },
          { label: 'إجمالي الاستخدامات', value: totalSavings, color: BRAND.accent },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#ECE6F0' }}>
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: '#ECE6F0' }}>
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد كوبونات بعد</p>
          <p className="text-sm text-gray-400 mb-6">أنشئ كوبون خصم لتشجيع العملاء على الشراء</p>
          <button onClick={() => setShowModal(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
            إنشاء أول كوبون
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: '#F5EFFA' }}>
              <tr>
                {['الكود', 'الخصم', 'الحد الأدنى', 'الاستخدام', 'الانتهاء', 'الحالة', 'إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-semibold" style={{ color: BRAND.primary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EFFA]">
              {coupons.map(c => {
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const isExhausted = c.maxUses && c.usedCount >= c.maxUses;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2.5 py-1 rounded-lg text-sm"
                          style={{ background: `${BRAND.primary}10`, color: BRAND.primary }}>
                          {c.code}
                        </span>
                        <button onClick={() => copyCode(c.code)} className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: BRAND.accent }}>
                        {c.discountType === 'percent' ? `${c.discountValue}%` : `${c.discountValue} ر.س`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.minOrderAmount ? `${c.minOrderAmount} ر.س` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: isExhausted ? '#ef4444' : 'inherit' }}>
                        {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.expiresAt ? (
                        <span style={{ color: isExpired ? '#ef4444' : 'inherit' }}>
                          {isExpired ? 'منتهي' : formatDate(c.expiresAt)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.isActive && !isExpired && !isExhausted ? 'text-emerald-700' : 'text-gray-500'}`}
                        style={{ background: c.isActive && !isExpired && !isExhausted ? '#d1fae5' : '#F5EFFA' }}>
                        {isExpired ? 'منتهي' : isExhausted ? 'مستنفد' : c.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleCoupon(c)} className="transition" title={c.isActive ? 'إيقاف' : 'تفعيل'}>
                          {c.isActive
                            ? <ToggleRight className="h-5 w-5" style={{ color: '#10b981' }} />
                            : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                        </button>
                        <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECE6F0]">
              <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>إنشاء كوبون خصم</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>كود الخصم *</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                    placeholder="مثال: SAVE20"
                    className="flex-1 px-3 py-2.5 rounded-xl border text-sm font-bold uppercase focus:outline-none focus:ring-2 transition tracking-widest"
                    style={{ borderColor: '#ECE6F0', color: BRAND.primary, fontFamily: 'monospace' }} />
                  <button type="button" onClick={generateCode}
                    className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-purple-50 transition"
                    style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
                    توليد تلقائي
                  </button>
                </div>
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>نوع الخصم</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none transition"
                    style={{ borderColor: '#ECE6F0' }}>
                    <option value="percent">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (ر.س)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>
                    قيمة الخصم {form.discountType === 'percent' ? '(%)' : '(ر.س)'}
                  </label>
                  <input type="number" min="0" step={form.discountType === 'percent' ? '1' : '0.01'}
                    max={form.discountType === 'percent' ? '100' : undefined}
                    value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} required
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                    style={{ borderColor: '#ECE6F0' }} placeholder={form.discountType === 'percent' ? '20' : '50'} />
                </div>
              </div>

              {/* Min Order + Max Uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>حد أدنى للطلب (اختياري)</label>
                  <input type="number" min="0" value={form.minOrderAmount}
                    onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                    style={{ borderColor: '#ECE6F0' }} placeholder="100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>أقصى عدد استخدامات</label>
                  <input type="number" min="1" value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                    style={{ borderColor: '#ECE6F0' }} placeholder="غير محدود" />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>تاريخ الانتهاء (اختياري)</label>
                <input type="datetime-local" value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition"
                  style={{ borderColor: '#ECE6F0' }} />
              </div>

              {/* Preview */}
              {form.code && form.discountValue && (
                <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: `${BRAND.primary}08`, border: `1.5px solid ${BRAND.primary}20` }}>
                  <Check className="h-4 w-4 flex-shrink-0" style={{ color: BRAND.accent }} />
                  <p className="text-xs text-gray-600">
                    الكود <strong>{form.code}</strong> يمنح خصم{' '}
                    <strong style={{ color: BRAND.accent }}>
                      {form.discountType === 'percent' ? `${form.discountValue}%` : `${form.discountValue} ر.س`}
                    </strong>
                    {form.minOrderAmount ? ` على الطلبات فوق ${form.minOrderAmount} ر.س` : ''}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 transition text-gray-600"
                  style={{ borderColor: '#ECE6F0' }}>
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'جارٍ الإنشاء…' : 'إنشاء الكوبون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
