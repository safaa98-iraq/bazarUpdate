'use client';

import { useState, useEffect, useCallback } from 'react';
import { Percent, Plus, Trash2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { PromotionPublic } from '@storebuilder/types';

const BRAND = { primary: '#2F2E4B', accent: '#DB6E93', border: '#FBE1EA', bg: '#F5EFFA' };

interface FormState {
  type: 'BOGO' | 'TIERED';
  name: string;
  buyQty: string; getQty: string; getDiscountPercent: string;
  tier1Qty: string; tier1Percent: string;
  tier2Qty: string; tier2Percent: string;
}

const emptyForm: FormState = {
  type: 'BOGO', name: '',
  buyQty: '2', getQty: '1', getDiscountPercent: '100',
  tier1Qty: '3', tier1Percent: '10', tier2Qty: '5', tier2Percent: '20',
};

function describe(p: PromotionPublic): string {
  if (p.type === 'BOGO') {
    const c = p.config as { buyQty?: number; getQty?: number; getDiscountPercent?: number };
    return `اشترِ ${c.buyQty ?? '-'} واحصل على ${c.getQty ?? '-'} بخصم ${c.getDiscountPercent ?? '-'}%`;
  }
  const c = p.config as { tiers?: { minQty: number; discountPercent: number }[] };
  return (c.tiers ?? []).map(t => `${t.minQty}+ قطع: خصم ${t.discountPercent}%`).join(' — ') || 'بدون مستويات';
}

export default function PromotionsPage() {
  useDocumentTitle('العروض التلقائية');
  const [promos, setPromos] = useState<PromotionPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchPromos = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: PromotionPublic[] }>('/api/promotions');
      setPromos(res.data ?? []);
    } catch { toast.error('فشل تحميل العروض'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('اسم العرض مطلوب'); return; }
    setSaving(true);
    try {
      const config = form.type === 'BOGO'
        ? { buyQty: Number(form.buyQty), getQty: Number(form.getQty), getDiscountPercent: Number(form.getDiscountPercent) }
        : { tiers: [
            { minQty: Number(form.tier1Qty), discountPercent: Number(form.tier1Percent) },
            { minQty: Number(form.tier2Qty), discountPercent: Number(form.tier2Percent) },
          ].filter(t => t.minQty > 0) };
      await api.post('/api/promotions', { type: form.type, name: form.name.trim(), scope: 'ALL', config });
      toast.success('تم إنشاء العرض ✓');
      setForm(emptyForm);
      setShowModal(false);
      fetchPromos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الإنشاء');
    } finally { setSaving(false); }
  };

  const toggleActive = async (p: PromotionPublic) => {
    try {
      await api.patch(`/api/promotions/${p.id}`, { isActive: !p.isActive });
      fetchPromos();
    } catch { toast.error('فشل التحديث'); }
  };

  const deletePromo = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    try {
      await api.delete(`/api/promotions/${id}`);
      toast.success('تم الحذف');
      fetchPromos();
    } catch { toast.error('فشل الحذف'); }
  };

  return (
    <div className="p-6 max-w-4xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>عروض تلقائية</h1>
          <p className="text-sm text-gray-500 mt-0.5">اشترِ واحصل على آخر، أو خصم متدرج حسب الكمية — يُطبّق تلقائياً على كل السلة دون كود</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> عرض جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: BRAND.border }}>
          <Percent className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد عروض بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: BRAND.border }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BRAND.bg }}>
                <Percent className="h-5 w-5" style={{ color: BRAND.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: BRAND.primary }}>{p.name}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: BRAND.bg, color: BRAND.primary }}>
                    {p.type === 'BOGO' ? 'اشترِ واحصل' : 'خصم متدرج'}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: p.isActive ? '#d1fae5' : '#F5EFFA', color: p.isActive ? '#065f46' : '#9ca3af' }}>
                    {p.isActive ? 'نشط' : 'موقوف'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{describe(p)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(p)} className="p-2 rounded-lg hover:bg-white transition">
                  {p.isActive ? <Eye className="h-4 w-4" style={{ color: '#10b981' }} /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                </button>
                <button onClick={() => deletePromo(p.id)} className="p-2 rounded-lg hover:bg-red-50 transition">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BRAND.border }}>
              <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>عرض جديد</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>اسم العرض *</label>
                <input value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: عرض نهاية الأسبوع"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>نوع العرض</label>
                <div className="flex gap-2">
                  {(['BOGO', 'TIERED'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition"
                      style={{ borderColor: form.type === t ? BRAND.accent : BRAND.border, color: form.type === t ? BRAND.accent : '#6b7280' }}>
                      {t === 'BOGO' ? 'اشترِ واحصل' : 'خصم متدرج'}
                    </button>
                  ))}
                </div>
              </div>

              {form.type === 'BOGO' ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>اشترِ</label>
                    <input type="number" min={1} value={form.buyQty} onChange={e => setForm(f => ({ ...f, buyQty: e.target.value }))}
                      className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>واحصل على</label>
                    <input type="number" min={1} value={form.getQty} onChange={e => setForm(f => ({ ...f, getQty: e.target.value }))}
                      className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>خصم %</label>
                    <input type="number" min={1} max={100} value={form.getDiscountPercent} onChange={e => setForm(f => ({ ...f, getDiscountPercent: e.target.value }))}
                      className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>من (قطعة)</label>
                      <input type="number" min={1} value={form.tier1Qty} onChange={e => setForm(f => ({ ...f, tier1Qty: e.target.value }))}
                        className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>خصم %</label>
                      <input type="number" min={1} max={100} value={form.tier1Percent} onChange={e => setForm(f => ({ ...f, tier1Percent: e.target.value }))}
                        className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>من (قطعة)</label>
                      <input type="number" min={1} value={form.tier2Qty} onChange={e => setForm(f => ({ ...f, tier2Qty: e.target.value }))}
                        className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>خصم %</label>
                      <input type="number" min={1} max={100} value={form.tier2Percent} onChange={e => setForm(f => ({ ...f, tier2Percent: e.target.value }))}
                        className="w-full px-2 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">يُطبَّق أعلى مستوى تصله كمية سلة الزبون</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 transition text-gray-600" style={{ borderColor: BRAND.border }}>
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
