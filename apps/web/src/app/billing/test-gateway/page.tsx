'use client';

/**
 * Stand-in for a real gateway's hosted payment page (PAYMENT_GATEWAY=test only).
 * "Pay" / "Cancel" call the same webhook a real gateway would, then return to the upgrade page.
 */
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Loader2 } from 'lucide-react';
import { formatUSD } from '@storebuilder/types';
import { LocaleRoot, useT } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function TestGateway() {
  const t = useT();
  const q = useSearchParams();
  const request = q.get('request') ?? '';
  const sig = q.get('sig') ?? '';
  const amount = Number(q.get('amount') ?? 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = async (action: 'pay' | 'cancel') => {
    setBusy(action); setError(null);
    try {
      const res = await fetch(`${API_URL}/api/billing/gateway/webhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request, sig, action }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? t("فشل الدفع"));
      window.location.href = `/dashboard/upgrade?${action === 'pay' ? 'paid' : 'cancelled'}=${request}`;
    } catch (e) { setError((e as Error).message); setBusy(null); }
  };

  return (
    <LocaleRoot className="min-h-screen bg-bz-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-bz-brand-50 flex items-center justify-center"><CreditCard className="h-7 w-7 text-bz-brand" /></div>
        <p className="text-xs font-bold text-amber-700 mt-4">{t("بوابة دفع تجريبية — لا يُخصم أي مبلغ")}</p>
        <h1 className="text-xl font-extrabold text-bz-ink mt-2">{t("إتمام الدفع")}</h1>
        <p className="text-sm text-bz-muted mt-1">{q.get('plan')} · {q.get('cycle')}</p>
        <p className="text-4xl font-extrabold text-bz-ink mt-4" dir="ltr">{formatUSD(amount)}</p>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button onClick={() => finish('pay')} disabled={!!busy} className="bz-btn w-full h-12 mt-6">
          {busy === 'pay' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {' '}{t("ادفع الآن")}
        </button>
        <button onClick={() => finish('cancel')} disabled={!!busy} className="bz-btn bz-btn-plain w-full h-11 mt-2">{t("إلغاء")}</button>
      </div>
    </LocaleRoot>
  );
}

export default function TestGatewayPage() {
  return <Suspense fallback={null}><TestGateway /></Suspense>;
}
