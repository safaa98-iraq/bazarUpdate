'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Printer, ExternalLink, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { SHIPMENT_STATUS_LABELS, type ShipmentPublic, type ShipmentStatus } from '@storebuilder/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type Row = ShipmentPublic & { order: { id: string; reference: string; customerName: string; customerPhone: string | null; total: number; governorate: string; branch: string | null } };
type Settings = {
  shipping: { senderName: string; senderPhone: string; pickupAddress: string };
  slug: string;
};

const STATUS_CLS: Record<string, string> = {
  CREATED: 'bg-bz-bg text-bz-ink-2', PICKED_UP: 'bg-bz-brand-50 text-bz-brand-600', IN_TRANSIT: 'bg-bz-brand-50 text-bz-brand-600',
  OUT_FOR_DELIVERY: 'bg-[#FEF3E2] text-[#B45309]', DELIVERED: 'bg-[#E2F7EE] text-[#17845C]', RETURNED: 'bg-[#FDECEC] text-[#C93636]', CANCELLED: 'bg-[#FDECEC] text-[#C93636]',
};

export default function ShippingPage() {
  useDocumentTitle('الشحن والبوالص');
  const [rows, setRows] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ senderName: '', senderPhone: '', pickupAddress: '' });
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const load = () => api.get<{ data: Row[] }>(`/api/shipments${filter ? `?status=${filter}` : ''}`).then(r => setRows(r.data)).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    api.get<{ data: Settings }>('/api/stores/my/features').then(r => {
      setSettings(r.data);
      const s = r.data.shipping;
      setForm({ senderName: s.senderName, senderPhone: s.senderPhone, pickupAddress: s.pickupAddress });
    }).catch(() => null);
  }, []);

  const save = async () => {
    try { await api.put('/api/stores/my/features/shipping', form); toast.success('تم حفظ إعدادات الشحن'); }
    catch (e) { toast.error((e as Error).message); }
  };
  const setStatus = async (row: Row, status: ShipmentStatus) => {
    try { await api.patch(`/api/shipments/${row.id}/status`, { status }); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="bz-large-title">الشحن والبوالص</h1>
          <p className="text-sm text-bz-muted mt-1">أنشئ البوليصة من صفحة الطلب، اطبعها وسلّمها لمندوب التوصيل، وحدّث حالة كل شحنة بنفسك — والزبون يتابعها من رابط التتبع.</p>
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && <a href={`/dashboard/shipping/print?orders=${selected.join(',')}`} target="_blank" className="bz-btn bz-btn-outline"><Printer className="h-4 w-4" /> طباعة {selected.length}</a>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {['', 'CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`bz-chip border ${filter === s ? 'bg-bz-ink text-white border-bz-ink' : 'bg-white border-bz-line text-bz-ink-2'}`}>
                {s ? SHIPMENT_STATUS_LABELS[s as ShipmentStatus] : 'الكل'}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="bz-card p-10 text-center">
              <ClayIcon name="truck" size={84} className="mx-auto mb-3" />
              <p className="bz-headline">لا توجد شحنات بعد</p>
              <p className="text-sm text-bz-muted mt-1 mb-4">افتح أي طلب واضغط «إنشاء وطباعة البوليصة».</p>
              <Link href="/dashboard/orders" className="bz-btn">الذهاب إلى الطلبات</Link>
            </div>
          ) : (
            <div className="bz-card overflow-hidden">
              {rows.map((r, i) => (
                <div key={r.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i ? 'border-t border-bz-line' : ''}`}>
                  <input type="checkbox" checked={selected.includes(r.orderId)} onChange={() => setSelected(sel => sel.includes(r.orderId) ? sel.filter(x => x !== r.orderId) : [...sel, r.orderId])} />
                  <div className="flex-1 min-w-[170px]">
                    <p className="font-semibold text-bz-ink">{r.order.customerName} <span className="text-xs text-bz-muted font-normal">#{r.order.reference}</span></p>
                    <p className="text-xs text-bz-muted">{r.order.governorate}{r.order.branch ? ` · 📍 ${r.order.branch}` : ''} · {formatDate(r.createdAt)}</p>
                    <p className="text-[11px] text-bz-muted mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{r.trackingCode}</p>
                  </div>
                  <span className="font-bold text-sm tabular-nums">{formatCurrency(r.order.total)}</span>
                  <select value={r.status} onChange={e => setStatus(r, e.target.value as ShipmentStatus)} className={`h-8 px-2 text-xs font-semibold border-0 rounded-full ${STATUS_CLS[r.status]}`}>
                    {(Object.keys(SHIPMENT_STATUS_LABELS) as ShipmentStatus[]).map(s => <option key={s} value={s}>{SHIPMENT_STATUS_LABELS[s]}</option>)}
                  </select>
                  <a title="البوليصة" href={`/dashboard/shipping/print?orders=${r.orderId}`} target="_blank" className="h-8 w-8 rounded-full hover:bg-bz-bg flex items-center justify-center text-bz-muted"><Printer className="h-4 w-4" /></a>
                  {settings && <a title="صفحة التتبع" href={`/store/${settings.slug}/track/${r.trackingCode}`} target="_blank" className="h-8 w-8 rounded-full hover:bg-bz-bg flex items-center justify-center text-bz-muted"><ExternalLink className="h-4 w-4" /></a>}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="bz-card p-5 h-fit">
          <div className="flex items-center gap-3 mb-4"><ClayIcon name="truck" size={40} /><h2 className="bz-headline">بيانات المرسل على البوليصة</h2></div>
          <div className="space-y-2">
            <input placeholder="اسم المرسل (افتراضياً اسم المتجر)" className="w-full h-10 px-3 border border-bz-line text-sm" value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} />
            <input dir="ltr" placeholder="هاتف المرسل" className="w-full h-10 px-3 border border-bz-line text-sm" value={form.senderPhone} onChange={e => setForm({ ...form, senderPhone: e.target.value })} />
            <input placeholder="عنوان الاستلام" className="w-full h-10 px-3 border border-bz-line text-sm" value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} />
          </div>
          <button onClick={save} className="bz-btn w-full mt-4"><Save className="h-4 w-4" /> حفظ</button>
        </aside>
      </div>
    </div>
  );
}
