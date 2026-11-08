'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Data = {
  reference: string; store: { name: string; logo: string | null; theme: string; slug: string };
  customerName: string; total: number; shippingFee: number;
  address: { governorate: string; city: string; address: string };
  items: { name: string; image: string | null; quantity: number; price: number; variant: string | null }[];
  confirmationStatus: 'NONE' | 'PENDING' | 'CONFIRMED' | 'REJECTED'; orderStatus: string;
};

/** The page the customer opens from WhatsApp to confirm or cancel their order before it ships. */
export default function ConfirmOrderPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'confirm' | 'reject' | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/${slug}/confirm/${token}`).then(r => r.json())
      .then(j => (j.success ? setData(j.data) : setError(j.error ?? 'الرابط غير صالح أو منتهي')))
      .catch(() => setError('حدث خطأ، حاول مرة أخرى'));
  }, [slug, token]);

  const act = async (action: 'confirm' | 'reject') => {
    if (action === 'reject' && !confirm('هل أنت متأكد من إلغاء الطلب؟')) return;
    setBusy(action);
    try {
      const r = await fetch(`${API_URL}/api/storefront/${slug}/confirm/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      setData(d => d && { ...d, confirmationStatus: j.data.confirmationStatus });
    } catch (e) { setError((e as Error).message || 'حدث خطأ، حاول مرة أخرى'); }
    finally { setBusy(null); }
  };

  const theme = data?.store.theme && /^#[0-9a-f]{6}$/i.test(data.store.theme) ? data.store.theme : '#20A9F4';

  return (
    <main className="min-h-screen bg-[#F6F8FA] px-4 py-10" dir="rtl">
      <div className="max-w-md mx-auto">
        {!data && !error && <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}
        {error && !data && <div className="bg-white rounded-3xl p-8 text-center"><XCircle className="h-12 w-12 mx-auto text-red-400 mb-3" /><p className="font-bold text-gray-900">{error}</p></div>}
        {data && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-black/5">
            <div className="p-6 text-center text-white" style={{ background: theme }}>
              {data.store.logo && <img src={data.store.logo} alt="" className="h-14 w-14 rounded-2xl bg-white object-contain mx-auto mb-3 p-1" />}
              <p className="text-sm opacity-90" data-no-translate>{data.store.name}</p>
              <h1 className="text-2xl font-bold mt-1">تأكيد طلبك</h1>
              <p className="text-sm opacity-90 mt-1"><span>رقم الطلب</span> #{data.reference}</p>
            </div>

            {data.confirmationStatus === 'CONFIRMED' ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-14 w-14 mx-auto text-green-500 mb-3" />
                <p className="font-bold text-gray-900">شكراً! تم تأكيد طلبك وسيتم تجهيزه للشحن.</p>
              </div>
            ) : data.confirmationStatus === 'REJECTED' || data.orderStatus === 'CANCELLED' ? (
              <div className="p-8 text-center">
                <XCircle className="h-14 w-14 mx-auto text-gray-400 mb-3" />
                <p className="font-bold text-gray-900">تم إلغاء الطلب. نأمل أن نخدمك قريباً.</p>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">راجع طلبك واضغط تأكيد ليتم تجهيزه وشحنه.</p>
                <p className="text-xs font-bold text-gray-400 mb-2">المنتجات</p>
                <div className="space-y-2 mb-4">
                  {data.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {it.image ? <img src={it.image} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="h-12 w-12 rounded-xl bg-gray-100" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate" data-no-translate>{it.name}</p>
                        {it.variant && <p className="text-xs text-gray-400" data-no-translate>{it.variant}</p>}
                      </div>
                      <span className="text-sm text-gray-500">× {it.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-gray-50 p-3 text-sm space-y-1 mb-5">
                  <p className="flex items-center gap-1.5 text-gray-600"><MapPin className="h-4 w-4" /> <span>التوصيل إلى</span>: <span data-no-translate>{data.address.governorate} — {data.address.city}</span></p>
                  <p className="flex justify-between font-bold text-gray-900"><span>المبلغ عند الاستلام</span><span>{formatCurrency(data.total)}</span></p>
                </div>
                {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}
                <button onClick={() => act('confirm')} disabled={!!busy} className="w-full h-14 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#22B07D' }}>
                  {busy === 'confirm' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} <span>نعم، أؤكد الطلب</span>
                </button>
                <button onClick={() => act('reject')} disabled={!!busy} className="w-full h-12 mt-3 rounded-2xl text-gray-500 font-semibold hover:bg-gray-50 disabled:opacity-60">
                  {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <span>لا، ألغِ الطلب</span>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
