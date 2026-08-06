'use client';

import { useState, useEffect, useCallback } from 'react';
import { Gift, Plus, Trash2, Eye, EyeOff, Loader2, X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { GiftCardPublic } from '@storebuilder/types';

const BRAND = { primary: '#2F2E4B', accent: '#DB6E93', border: '#FBE1EA', bg: '#F5EFFA' };

export default function GiftCardsPage() {
  useDocumentTitle('بطاقات الهدايا');
  const [cards, setCards] = useState<GiftCardPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState({ initialValue: '', expiresAt: '', recipientEmail: '', note: '' });

  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: GiftCardPublic[] }>('/api/gift-cards');
      setCards(res.data ?? []);
    } catch { toast.error('فشل تحميل بطاقات الهدايا'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.initialValue || Number(form.initialValue) <= 0) { toast.error('أدخل قيمة صحيحة للبطاقة'); return; }
    setSaving(true);
    try {
      await api.post('/api/gift-cards', {
        initialValue: Number(form.initialValue),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        recipientEmail: form.recipientEmail || undefined,
        note: form.note || undefined,
      });
      toast.success('تم إصدار بطاقة الهدايا ✓');
      setForm({ initialValue: '', expiresAt: '', recipientEmail: '', note: '' });
      setShowModal(false);
      fetchCards();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الإصدار');
    } finally { setSaving(false); }
  };

  const toggleActive = async (c: GiftCardPublic) => {
    try {
      await api.patch(`/api/gift-cards/${c.id}`, { isActive: !c.isActive });
      fetchCards();
    } catch { toast.error('فشل التحديث'); }
  };

  const deleteCard = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه البطاقة؟')) return;
    try {
      await api.delete(`/api/gift-cards/${id}`);
      toast.success('تم الحذف');
      fetchCards();
    } catch { toast.error('فشل الحذف'); }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('تم نسخ الكود');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 max-w-4xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>بطاقات الهدايا</h1>
          <p className="text-sm text-gray-500 mt-0.5">أصدر بطاقة برصيد معيّن يستخدمها الزبون كخصم عند الدفع</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> إصدار بطاقة
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: BRAND.border }}>
          <Gift className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد بطاقات هدايا بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border p-4 flex items-center gap-4" style={{ borderColor: BRAND.border }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: BRAND.bg }}>
                <Gift className="h-5 w-5" style={{ color: BRAND.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm" style={{ color: BRAND.primary, direction: 'ltr' }}>{c.code}</span>
                  <button onClick={() => copyCode(c.code, c.id)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
                    {copiedId === c.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: c.isActive ? '#d1fae5' : '#F5EFFA', color: c.isActive ? '#065f46' : '#9ca3af' }}>
                    {c.isActive ? 'نشطة' : 'موقوفة'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  الرصيد المتبقي: <span className="font-bold" style={{ color: BRAND.primary }}>{formatCurrency(c.remainingBalance)}</span> من أصل {formatCurrency(c.initialValue)}
                  {c.expiresAt && <> · تنتهي {new Date(c.expiresAt).toLocaleDateString('ar-IQ')}</>}
                </p>
                {c.note && <p className="text-xs text-gray-400 mt-0.5">{c.note}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(c)} className="p-2 rounded-lg hover:bg-white transition" title={c.isActive ? 'إيقاف' : 'تفعيل'}>
                  {c.isActive ? <Eye className="h-4 w-4" style={{ color: '#10b981' }} /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                </button>
                <button onClick={() => deleteCard(c.id)} className="p-2 rounded-lg hover:bg-red-50 transition">
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
              <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>إصدار بطاقة هدايا</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>قيمة البطاقة (د.ع) *</label>
                <input type="number" min={1} value={form.initialValue} required
                  onChange={e => setForm(f => ({ ...f, initialValue: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} placeholder="25000" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>تنتهي في (اختياري)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>بريد المستلم (اختياري)</label>
                <input type="email" value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>ملاحظة (اختياري)</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="مثال: تعويض عن تأخير الشحن"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border rounded-xl text-sm font-medium hover:bg-gray-50 transition text-gray-600" style={{ borderColor: BRAND.border }}>
                  إلغاء
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} إصدار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
