'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilePlus2, Plus, Trash2, Loader2, X, Send, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import type { OrderPublic, ProductPublic } from '@storebuilder/types';

const BRAND = { primary: '#2F2E4B', accent: '#DB6E93', border: '#FBE1EA', bg: '#F5EFFA' };

interface DraftLine { productId: string; quantity: number }

export default function DraftOrdersPage() {
  useDocumentTitle('طلبات يدوية');
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get<{ success: boolean; data: OrderPublic[] }>('/api/orders?status=DRAFT&limit=50'),
        api.get<{ success: boolean; data: ProductPublic[] }>('/api/products?limit=200'),
      ]);
      setOrders(ordersRes.data ?? []);
      setProducts(productsRes.data ?? []);
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addLine = () => {
    if (!products.length) return;
    setLines(prev => [...prev, { productId: products[0].id, quantity: 1 }]);
  };
  const updateLine = (i: number, patch: Partial<DraftLine>) => {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, ...patch } : l));
  };
  const removeLine = (i: number) => setLines(prev => prev.filter((_, j) => j !== i));

  const total = lines.reduce((sum, l) => {
    const p = products.find(pr => pr.id === l.productId);
    return sum + (p ? p.price * l.quantity : 0);
  }, 0);

  const resetForm = () => {
    setCustomerName(''); setCustomerPhone(''); setDraftNote(''); setLines([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { toast.error('اسم الزبون مطلوب'); return; }
    if (!lines.length) { toast.error('أضف منتجاً واحداً على الأقل'); return; }
    setSaving(true);
    try {
      await api.post('/api/orders', {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        draftNote: draftNote.trim() || undefined,
        shippingAddress: {},
        items: lines.map(l => ({ productId: l.productId, quantity: l.quantity })),
      });
      toast.success('تم إنشاء الطلب كمسودة ✓');
      resetForm();
      setShowModal(false);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الإنشاء');
    } finally { setSaving(false); }
  };

  const publish = async (id: string) => {
    if (!confirm('نشر هذا الطلب سينقص الكمية من المخزون ويجعله طلباً فعلياً. متابعة؟')) return;
    setPublishingId(id);
    try {
      await api.post(`/api/orders/${id}/publish`);
      toast.success('تم نشر الطلب ✓');
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل النشر');
    } finally { setPublishingId(null); }
  };

  return (
    <div className="p-6 max-w-4xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>طلبات يدوية</h1>
          <p className="text-sm text-gray-500 mt-0.5">سجّل طلباً وصلك عبر واتساب أو انستغرام، وانشره لاحقاً لينقص من المخزون</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
          <Plus className="h-4 w-4" /> طلب جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: BRAND.border }}>
          <FilePlus2 className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد طلبات يدوية بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl border p-4" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: BRAND.primary }}>{o.customerName}</span>
                    {o.customerPhone && <span className="text-xs text-gray-400" dir="ltr">{o.customerPhone}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{o.items.length} منتج · {formatCurrency(o.total)}</p>
                  {o.draftNote && <p className="text-xs text-gray-400 mt-0.5">{o.draftNote}</p>}
                </div>
                <button onClick={() => publish(o.id)} disabled={publishingId === o.id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-60"
                  style={{ background: BRAND.primary }}>
                  {publishingId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  نشر الطلب
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white" style={{ borderColor: BRAND.border }}>
              <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>طلب يدوي جديد</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>اسم الزبون *</label>
                  <input value={customerName} required onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>رقم الهاتف</label>
                  <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr"
                    className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: BRAND.border }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold" style={{ color: BRAND.primary }}>المنتجات</label>
                  <button type="button" onClick={addLine} className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND.accent }}>
                    <Plus className="h-3 w-3" /> إضافة منتج
                  </button>
                </div>
                {lines.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-400 border-2 border-dashed rounded-xl" style={{ borderColor: BRAND.border }}>
                    <Package className="h-4 w-4" /> لا توجد منتجات مضافة
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lines.map((l, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select value={l.productId} onChange={e => updateLine(i, { productId: e.target.value })}
                          className="flex-1 px-2.5 py-2 rounded-lg border text-xs bg-white focus:outline-none" style={{ borderColor: BRAND.border }}>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
                        </select>
                        <input type="number" min={1} value={l.quantity}
                          onChange={e => updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })}
                          className="w-16 px-2 py-2 rounded-lg border text-xs focus:outline-none" style={{ borderColor: BRAND.border }} />
                        <button type="button" onClick={() => removeLine(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {lines.length > 0 && (
                  <p className="text-xs text-left mt-2 font-bold" style={{ color: BRAND.primary }}>الإجمالي: {formatCurrency(total)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: BRAND.primary }}>ملاحظة داخلية (اختياري)</label>
                <input value={draftNote} onChange={e => setDraftNote(e.target.value)}
                  placeholder="مثال: طلب عبر واتساب"
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
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ كمسودة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
