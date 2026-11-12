'use client';

import { useT } from '@/lib/i18n';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { Barcode128 } from '@/components/ui/Barcode128';
import { formatCurrency } from '@/lib/utils';

type Waybill = {
  orderId: string; reference: string; createdAt: string;
  customerName: string; customerPhone: string | null;
  address: { governorate?: string; city?: string; address?: string; notes?: string };
  codAmount: number; shippingFee: number;
  items: { name: string; quantity: number; variant: string | null }[];
  trackingCode: string;
  branch: { name: string; phone: string | null; address: string | null } | null;
};
type Data = { store: { name: string; slug: string; logo: string | null }; sender: { name: string; phone: string; address: string }; waybills: Waybill[] };

/** A6 (105×148mm) waybills, one per page — print from the browser. */
function WaybillsInner() {
  const t = useT();
  const ids = useSearchParams().get('orders') ?? '';
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: Data }>(`/api/shipments/waybills?orderIds=${encodeURIComponent(ids)}`)
      .then(r => setData(r.data)).catch(e => setError(e.message));
  }, [ids]);

  if (error) return <p className="p-8 text-bz-red">{error}</p>;
  if (!data) return <p className="p-8 text-bz-muted">{t("جارٍ تجهيز البوالص…")}</p>;
  if (!data.waybills.length) return <p className="p-8 text-bz-muted">{t("لا توجد بوالص لهذه الطلبات — أنشئ البوليصة من صفحة الطلبات أولاً.")}</p>;

  const trackBase = typeof window !== 'undefined' ? `${window.location.origin}/store/${data.store.slug}/track` : '';

  return (
    <div className="bg-bz-bg min-h-screen print:bg-white">
      <style>{`@media print { @page { size: 105mm 148mm; margin: 0 } body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="print:hidden sticky top-0 z-10 bz-bar border-b border-bz-line px-6 h-14 flex items-center justify-between">
        <p className="font-bold">{data.waybills.length} {' '}{t("بوليصة جاهزة للطباعة")}</p>
        <button onClick={() => window.print()} className="bz-btn h-10"><Printer className="h-4 w-4" /> {' '}{t("طباعة")}</button>
      </div>
      <div className="flex flex-wrap justify-center gap-6 p-6 print:p-0 print:gap-0 print:block">
        {data.waybills.map(w => (
          <article key={w.orderId} className="bg-white w-[105mm] h-[148mm] p-[5mm] text-[11px] text-black flex flex-col border border-black/20 print:border-0 print:break-after-page overflow-hidden" style={{ fontFamily: 'var(--font-arabic)' }}>
            <header className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                {data.store.logo && <img src={data.store.logo} alt="" className="h-9 w-9 object-contain" />}
                <div>
                  <p className="font-bold text-[14px] leading-tight">{data.store.name}</p>
                  <p className="text-[10px]">{w.branch?.name ?? data.sender.name}{(w.branch?.phone || data.sender.phone) ? ` · ${w.branch?.phone || data.sender.phone}` : ''}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px]">{t("رقم الطلب")}</p>
                <p className="font-bold text-[14px]" dir="ltr">#{w.reference}</p>
              </div>
            </header>

            <section className="py-2 border-b border-dashed border-black">
              <p className="text-[10px] font-bold">{t("إلى:")}</p>
              <p className="font-bold text-[15px] leading-snug">{w.customerName}</p>
              <p className="font-bold text-[14px]" dir="ltr" style={{ textAlign: 'right' }}>{w.customerPhone}</p>
              <p className="text-[12px] font-bold mt-1">{w.address.governorate} — {w.address.city}</p>
              <p className="text-[11px]">{w.address.address}</p>
              {w.address.notes && <p className="text-[10px] mt-0.5">{t("ملاحظة:")}{' '}{w.address.notes}</p>}
            </section>

            <section className="py-2 border-b border-dashed border-black flex-1 overflow-hidden">
              <p className="text-[10px] font-bold mb-1">{t("المحتويات (")}{w.items.reduce((n, i) => n + i.quantity, 0)} {' '}{t("قطعة):")}</p>
              {w.items.slice(0, 6).map((it, i) => (
                <p key={i} className="truncate">• {it.name}{it.variant ? ` (${it.variant})` : ''} × {it.quantity}</p>
              ))}
              {w.items.length > 6 && <p>{t("… و")}{w.items.length - 6} {' '}{t("منتجات أخرى")}</p>}
            </section>

            <section className="py-2 flex items-center justify-between border-b-2 border-black">
              <span className="text-[12px] font-bold">{t("المبلغ عند الاستلام")}</span>
              <span className="text-[18px] font-extrabold">{formatCurrency(w.codAmount)}</span>
            </section>

            <footer className="pt-2 flex flex-col items-center">
              <Barcode128 value={w.trackingCode} height={46} className="w-full max-w-[85mm] h-[12mm]" />
              <p className="font-bold tracking-[0.2em] text-[12px] mt-1" dir="ltr">{w.trackingCode}</p>
              <p className="text-[9px] mt-0.5" dir="ltr">{trackBase}/{w.trackingCode}</p>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function WaybillsPrintPage() {
  return <Suspense fallback={null}><WaybillsInner /></Suspense>;
}
