'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CheckCircle2, Smartphone } from 'lucide-react';

interface StoreInfo { name: string; theme: string; }

export default function OrderConfirmationPage() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [store, setStore] = useState<StoreInfo | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: StoreInfo }>(`/api/storefront/${slug}`, { noAuth: true })
      .then(r => setStore(r.data)).catch(() => null);
  }, [slug]);

  useEffect(() => {
    if (store?.name) document.title = `تم تأكيد الطلب — ${store.name}`;
  }, [store?.name]);

  const theme = store?.theme ?? '#2F2E4B';

  return (
    <div className="min-h-screen flex items-center justify-center px-4" dir="rtl" style={{ background: '#F5EFFA' }}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
        {/* Check icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 12px 40px rgba(5,150,105,.25)' }}>
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">تم تأكيد طلبك!</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          شكراً لطلبك من <strong className="text-gray-800">{store?.name}</strong>.<br />
          سيتواصل معك فريق المتجر قريباً لتأكيد التوصيل.
        </p>

        {/* Order info */}
        <div className="rounded-2xl p-5 mb-6 text-right" style={{ background: '#F5EFFA', border: '1px solid #FBE1EA' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold" style={{ color: theme }}>تفاصيل الطلب</span>
          </div>
          {orderId && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">رقم الطلب</span>
              <span className="font-mono font-bold text-gray-800 text-xs">{orderId.slice(0, 16)}…</span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">الحالة</span>
            <span className="font-bold text-amber-600">قيد المراجعة</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">طريقة الدفع</span>
            <span className="font-bold text-gray-800">الدفع عند الاستلام</span>
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-2xl p-4 mb-6 text-right" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <p className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-1.5"><Smartphone size={14} /> الخطوات التالية</p>
          {[
            'سيتصل بك المتجر لتأكيد طلبك',
            'سيتم ترتيب موعد التوصيل معك',
            'استلم طلبك وادفع نقداً للمندوب',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-emerald-700 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>

        <Link href={`/store/${slug}`}
          className="block w-full py-3.5 font-bold text-white rounded-2xl transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${theme}, #DB6E93)` }}>
          مواصلة التسوق
        </Link>
      </div>
    </div>
  );
}
