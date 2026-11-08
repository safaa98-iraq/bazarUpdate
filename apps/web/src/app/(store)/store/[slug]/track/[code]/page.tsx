'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, Package, CheckCircle2, Truck, MapPin, RotateCcw, XCircle, Circle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SHIPMENT_STATUS_LABELS, type ShipmentEvent, type ShipmentStatus } from '@storebuilder/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const FLOW: ShipmentStatus[] = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const ICONS: Record<ShipmentStatus, React.ElementType> = {
  CREATED: Package, PICKED_UP: Package, IN_TRANSIT: Truck, OUT_FOR_DELIVERY: MapPin, DELIVERED: CheckCircle2, RETURNED: RotateCcw, CANCELLED: XCircle,
};

type Data = {
  trackingCode: string; status: ShipmentStatus; statusLabel: string; events: ShipmentEvent[];
  store: { name: string; logo: string | null; theme: string; slug: string };
  reference: string; customerName: string; customerPhone: string; destination: string; total: number; createdAt: string;
};

/** Public shipment tracking page (link/QR printed on the waybill). */
export default function TrackPage() {
  const { slug, code } = useParams<{ slug: string; code: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/${slug}/track/${encodeURIComponent(code)}`).then(r => r.json())
      .then(j => (j.success ? setData(j.data) : setError(j.error ?? 'لم يتم العثور على الشحنة')))
      .catch(() => setError('حدث خطأ، حاول مرة أخرى'));
  }, [slug, code]);

  const theme = data?.store.theme && /^#[0-9a-f]{6}$/i.test(data.store.theme) ? data.store.theme : '#20A9F4';
  const failed = data && (data.status === 'RETURNED' || data.status === 'CANCELLED');
  const reached = data ? FLOW.indexOf(data.status) : -1;
  const at = (s: ShipmentStatus) => data?.events.filter(e => e.status === s).at(-1)?.at;

  return (
    <main className="min-h-screen bg-[#F6F8FA] px-4 py-10" dir="rtl">
      <div className="max-w-md mx-auto">
        {!data && !error && <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}
        {error && <div className="bg-white rounded-3xl p-8 text-center"><XCircle className="h-12 w-12 mx-auto text-red-400 mb-3" /><p className="font-bold text-gray-900">{error}</p>
          <Link href={`/store/${slug}`} className="inline-block mt-4 text-sm font-semibold" style={{ color: theme }}>العودة إلى المتجر</Link></div>}
        {data && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/5">
            <div className="p-6 text-white" style={{ background: theme }}>
              <div className="flex items-center gap-3">
                {data.store.logo && <img src={data.store.logo} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />}
                <div>
                  <p className="text-sm opacity-90" data-no-translate>{data.store.name}</p>
                  <h1 className="text-xl font-bold">تتبع شحنتك</h1>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-white/15 p-4">
                <p className="text-xs opacity-80">رقم التتبع</p>
                <p className="text-lg font-bold tracking-widest" dir="ltr" style={{ textAlign: 'right' }}>{data.trackingCode}</p>
                <p className="text-2xl font-bold mt-2">{SHIPMENT_STATUS_LABELS[data.status]}</p>
              </div>
            </div>

            <div className="p-6">
              <ol className="relative">
                {(failed ? [...FLOW.slice(0, Math.max(1, data.events.length - 1)), data.status] : FLOW).map((s, i, arr) => {
                  const done = failed ? true : i <= reached;
                  const Icon = ICONS[s];
                  return (
                    <li key={s} className="flex gap-3 pb-5 last:pb-0 relative">
                      {i < arr.length - 1 && <span className="absolute right-[15px] top-8 bottom-0 w-0.5" style={{ background: done && (failed || i < reached) ? theme : '#E6ECF1' }} />}
                      <span className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ background: done ? (s === 'RETURNED' || s === 'CANCELLED' ? '#F04F4F' : theme) : '#EEF2F6', color: done ? '#fff' : '#A3B0BC' }}>
                        {done ? <Icon className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                      </span>
                      <div className="pt-1">
                        <p className={`text-sm font-semibold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{SHIPMENT_STATUS_LABELS[s]}</p>
                        {at(s) && <p className="text-xs text-gray-400">{new Date(at(s)!).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm space-y-2">
                <p className="flex justify-between"><span className="text-gray-500">رقم الطلب</span><span className="font-semibold">#{data.reference}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">الوجهة</span><span className="font-semibold" data-no-translate>{data.destination}</span></p>
                <p className="flex justify-between"><span className="text-gray-500">المبلغ عند الاستلام</span><span className="font-semibold">{formatCurrency(data.total)}</span></p>
              </div>
              <Link href={`/store/${slug}`} className="block text-center mt-5 text-sm font-semibold" style={{ color: theme }}>العودة إلى المتجر</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
