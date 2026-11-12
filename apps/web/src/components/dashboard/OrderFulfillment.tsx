'use client';

import { useT } from '@/lib/i18n';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Truck, Printer, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { SHIPMENT_STATUS_LABELS, type OrderPublic, type ShipmentStatus, type WarehousePublic } from '@storebuilder/types';

/** Fulfilment actions inside an expanded order: branch, waybill + tracking. */
export function OrderFulfillment({
  order, branches, canMoveBranch, onChange,
}: {
  order: OrderPublic;
  branches: WarehousePublic[];
  canMoveBranch: boolean;
  onChange: (o: OrderPublic) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const shipment = order.shipment ?? null;
  const closed = order.status === 'CANCELLED' || order.status === 'DRAFT';

  const createWaybill = async () => {
    setBusy('ship');
    try {
      const r = await api.post<{ data: { ok: boolean; error?: string; shipment?: OrderPublic['shipment'] }[] }>('/api/shipments', { orderIds: [order.id] });
      const res = r.data[0];
      if (!res.ok) throw new Error(res.error);
      toast.success(t("تم إنشاء البوليصة"));
      onChange({ ...order, status: order.status === 'PENDING' || order.status === 'PAID' ? 'SHIPPED' : order.status, shipment: res.shipment ?? null });
      window.open(`/dashboard/shipping/print?orders=${order.id}`, '_blank');
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const moveBranch = async (warehouseId: string) => {
    setBusy('branch');
    try {
      const r = await api.patch<{ data: OrderPublic }>(`/api/orders/${order.id}/warehouse`, { warehouseId });
      onChange(r.data); toast.success(t("تم نقل الطلب"));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="mt-4 rounded-2xl border border-bz-line bg-bz-bg/60 p-4 grid gap-4 md:grid-cols-2">
      {/* Branch */}
      <div>
        <p className="text-xs font-bold text-bz-ink-2 mb-2">{t("الفرع")}</p>
        {branches.length === 0 ? (
          <Link href="/dashboard/branches" className="text-xs text-bz-brand-600 hover:underline">{t("لا توجد فروع — أضف فرعاً")}</Link>
        ) : canMoveBranch && !shipment && !closed ? (
          <label className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-bz-muted" />
            <select disabled={!!busy} value={order.warehouseId ?? ''} onChange={e => e.target.value && moveBranch(e.target.value)} className="flex-1 h-9 px-2 border border-bz-line text-sm">
              {!order.warehouseId && <option value="">{t("— غير محدد —")}</option>}
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        ) : (
          <span className="bz-chip bg-white border border-bz-line text-bz-ink-2"><MapPin className="h-3 w-3" /> {order.warehouseName ?? '—'}</span>
        )}
      </div>

      {/* Waybill / tracking */}
      <div>
        <p className="text-xs font-bold text-bz-ink-2 mb-2">{t("الشحن")}</p>
        {shipment ? (
          <div className="space-y-2">
            <span className="bz-chip bg-bz-brand-50 text-bz-brand-600"><Truck className="h-3 w-3" /> {SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatus]}</span>
            <p className="text-xs text-bz-muted" dir="ltr" style={{ textAlign: 'right' }}>{shipment.trackingCode}</p>
            <div className="flex gap-2">
              <a href={`/dashboard/shipping/print?orders=${order.id}`} target="_blank" className="bz-btn bz-btn-outline h-8 px-3 text-xs"><Printer className="h-3.5 w-3.5" /> {' '}{t("البوليصة")}</a>
              <Link href={`/dashboard/shipping?order=${order.id}`} className="bz-btn bz-btn-outline h-8 px-3 text-xs"><ExternalLink className="h-3.5 w-3.5" /> {' '}{t("التتبع")}</Link>
            </div>
          </div>
        ) : !closed ? (
          <button onClick={createWaybill} disabled={!!busy} className="bz-btn h-9 px-4 text-[13px] w-full">
            {busy === 'ship' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} {' '}{t("إنشاء وطباعة البوليصة")}
          </button>
        ) : <span className="text-xs text-bz-muted">—</span>}
      </div>
    </div>
  );
}
