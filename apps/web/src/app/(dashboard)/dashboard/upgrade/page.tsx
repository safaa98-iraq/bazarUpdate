'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X, Clock, CheckCircle2, XCircle, Crown, Check, Minus, Building2, Smartphone, Sparkles } from 'lucide-react';
import {
  PLAN_CONFIGS, PLAN_COMPARISON, BILLING_CYCLE_LABELS, LIFETIME_INSTALLMENTS, CYCLE_DISCOUNT_PERCENT, yearlySavingIQD,
  type PlanKey, type BillingCycle,
} from '@storebuilder/types';
import { api } from '@/lib/api';
import { trackPage, track } from '@/lib/track';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PricingPlans } from '@/components/pricing/PricingPlans';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { cn } from '@/lib/utils';

const n = (v: number) => v.toLocaleString('en-US');

interface PayConfig {
  qrImageUrl: string | null; bankName: string; accountName: string; accountNumber: string; instructions: string;
  zainCashNumber: string | null; zainCashName: string | null;
}
interface Status {
  plan: PlanKey; billingCycle: string | null; planExpiresAt: string | null; daysLeft: number | null;
  legacyPricing: boolean; monthlyPaymentsCount: number; lastYearlyPaidAt: string | null;
  lifetime: { target: PlanKey; paid: number; of: number; total: number | null } | null;
  lifetimeSeatsLeft: number; lifetimeSeats: number;
  pendingRequest: { id: string; planTarget: PlanKey; cycle: string; installment: number | null; amount: number; createdAt: string } | null;
}
interface Quote { plan: PlanKey; cycle: string; amount: number; installment?: number; installmentsTotal?: number; note?: string }
interface MyRequest { id: string; planTarget: string; status: string; adminNote: string | null; createdAt: string }

const CYCLE_AR: Record<string, string> = {
  MONTHLY: 'شهري', YEARLY: 'سنوي', LIFETIME: 'أبدي', TRIAL: 'تجربة مجانية', LEGACY: 'اشتراك سابق', MANUAL: 'مفعّل من الإدارة',
  LIFETIME_INSTALLMENT: 'أبدي بالتقسيط', LIFETIME_UPGRADE: 'ترقية الأبدي',
};

function PayModal({ plan, cycle, config, onClose, onDone }: {
  plan: PlanKey; cycle: BillingCycle; config: PayConfig; onClose: () => void; onDone: () => void;
}) {
  const [installments, setInstallments] = useState<1 | 3>(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'BANK' | 'ZAINCASH'>('BANK');
  const [txRef, setTxRef] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuote(null); setError(null);
    api.get<{ data: Quote }>(`/api/billing/quote?plan=${plan}&cycle=${cycle}&installments=${installments}`)
      .then(r => setQuote(r.data)).catch(e => setError((e as Error).message));
  }, [plan, cycle, installments]);

  const pay = async () => {
    setBusy(true);
    try {
      await api.post('/api/billing/pay-request', { plan, cycle, installments, method, txRef: txRef.trim() || undefined });
      track({ event: 'payment_requested', meta: { plan, cycle, installments } });
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const cfg = PLAN_CONFIGS[plan];
  return (
    <div onClick={onClose} className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-bz-line">
          <div>
            <p className="text-xs text-bz-muted">الاشتراك في</p>
            <h2 className="text-lg font-extrabold text-bz-ink">{cfg.nameAr} — {BILLING_CYCLE_LABELS[cycle]}</h2>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="h-9 w-9 rounded-full bg-bz-bg flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {cycle === 'LIFETIME' && !error && quote?.cycle !== 'LIFETIME_UPGRADE' && (
            <div className="grid grid-cols-2 gap-2">
              {([1, 3] as const).map(k => (
                <button key={k} onClick={() => setInstallments(k)}
                  className={cn('rounded-2xl border-2 p-3 text-sm font-bold', installments === k ? 'border-bz-brand bg-bz-brand-50 text-bz-brand-600' : 'border-bz-line text-bz-ink-2')}>
                  {k === 1 ? 'دفعة واحدة' : `${LIFETIME_INSTALLMENTS} دفعات خلال 60 يوماً`}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-bz-bg p-4 text-center">
            {error ? <p className="text-sm text-red-600 font-semibold">{error}</p>
              : !quote ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-bz-brand" />
              : (
                <>
                  <p className="text-xs text-bz-muted">{quote.installment ? `المبلغ المطلوب الآن (الدفعة ${quote.installment} من ${quote.installmentsTotal})` : 'المبلغ المطلوب'}</p>
                  <p className="text-3xl font-extrabold text-bz-ink tabular-nums mt-1">{n(quote.amount)} <span className="text-base text-bz-muted">د.ع</span></p>
                  {quote.note && <p className="text-xs text-green-700 font-semibold mt-1">{quote.note}</p>}
                  {(quote.cycle === 'YEARLY' || quote.cycle === 'LIFETIME') && (
                    <p className="text-xs mt-1"><span className="line-through text-bz-muted">{n(cfg.listPrices[cycle])} د.ع</span> <span className="font-bold text-red-500">خصم {CYCLE_DISCOUNT_PERCENT[cycle]}%</span></p>
                  )}
                  {cycle === 'YEARLY' && <p className="text-xs text-green-700 font-semibold mt-1">وفّرت {n(yearlySavingIQD(plan))} د.ع مقارنة بالشهري</p>}
                </>
              )}
          </div>

          {!error && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMethod('BANK')} className={cn('rounded-2xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2', method === 'BANK' ? 'border-bz-ink' : 'border-bz-line text-bz-muted')}>
                  <Building2 className="h-4 w-4" /> تحويل مصرفي
                </button>
                <button onClick={() => setMethod('ZAINCASH')} className={cn('rounded-2xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2', method === 'ZAINCASH' ? 'border-bz-ink' : 'border-bz-line text-bz-muted')}>
                  <Smartphone className="h-4 w-4" /> ZainCash
                </button>
              </div>
              <div className="rounded-2xl border border-bz-line p-4 text-sm leading-7">
                {method === 'BANK' ? (
                  <>
                    {config.qrImageUrl && <img src={config.qrImageUrl} alt="رمز QR للدفع" className="h-40 w-40 mx-auto object-contain mb-2" />}
                    <p><span className="text-bz-muted">المصرف:</span> {config.bankName}</p>
                    <p><span className="text-bz-muted">اسم الحساب:</span> {config.accountName}</p>
                    <p><span className="text-bz-muted">رقم الحساب:</span> <span dir="ltr">{config.accountNumber}</span></p>
                  </>
                ) : config.zainCashNumber ? (
                  <>
                    <p><span className="text-bz-muted">رقم ZainCash:</span> <span dir="ltr" className="font-bold">{config.zainCashNumber}</span></p>
                    {config.zainCashName && <p><span className="text-bz-muted">الاسم:</span> {config.zainCashName}</p>}
                  </>
                ) : <p className="text-bz-muted">تواصل مع دعم بازار لاستلام رقم ZainCash.</p>}
                <p className="text-xs text-bz-muted mt-2">{config.instructions}</p>
              </div>
              <input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="رقم العملية أو آخر 4 أرقام (اختياري)"
                className="w-full h-11 px-4 rounded-2xl border border-bz-line text-sm" />
              <button onClick={pay} disabled={busy || !quote} className="bz-btn w-full h-12 text-base">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} دفعت الآن
              </button>
              <p className="text-[11px] text-bz-muted text-center">نراجع التحويل ونفعّل باقتك عادةً خلال ساعات. استرداد خلال 14 يوماً.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({ s, onPayNextInstallment }: { s: Status; onPayNextInstallment: () => void }) {
  const cfg = PLAN_CONFIGS[s.plan];
  const expires = s.planExpiresAt ? new Date(s.planExpiresAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  return (
    <div className="bz-card p-5 flex flex-wrap items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-bz-brand-50 flex items-center justify-center"><Crown className="h-6 w-6 text-bz-brand" /></div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-xs text-bz-muted">باقتك الحالية</p>
        <p className="text-lg font-extrabold text-bz-ink">
          {cfg.nameAr}
          {s.billingCycle && <span className="text-sm font-semibold text-bz-muted"> · {CYCLE_AR[s.billingCycle] ?? s.billingCycle}</span>}
        </p>
        {s.billingCycle === 'TRIAL' && s.daysLeft !== null && (
          <p className="text-sm text-amber-700 font-semibold">بقي {s.daysLeft} يوماً من تجربة الأعمال — بعدها ينتقل متجرك للمجانية</p>
        )}
        {s.billingCycle !== 'TRIAL' && expires && <p className="text-sm text-bz-muted">يتجدد أو ينتهي في {expires} ({s.daysLeft} يوماً)</p>}
        {s.billingCycle === 'LIFETIME' && <p className="text-sm text-green-700 font-semibold">اشتراك أبدي — لا تجديد</p>}
      </div>
      {s.lifetime && (
        <div className="w-full sm:w-auto">
          <p className="text-sm font-semibold text-bz-ink">الأبدي بالتقسيط: {s.lifetime.paid} من {s.lifetime.of} دفعات</p>
          <div className="h-2 rounded-full bg-bz-bg mt-1.5 overflow-hidden"><div className="h-full bg-bz-brand" style={{ width: `${(s.lifetime.paid / s.lifetime.of) * 100}%` }} /></div>
          {!s.pendingRequest && <button onClick={onPayNextInstallment} className="bz-btn h-9 text-sm mt-2">ادفع الدفعة {s.lifetime.paid + 1}</button>}
        </div>
      )}
    </div>
  );
}

function CompareTable() {
  const cell = (v: boolean | string | null) =>
    v === true ? <Check className="h-4 w-4 mx-auto text-green-600" strokeWidth={3} />
      : v === false || v === null ? <Minus className="h-4 w-4 mx-auto text-bz-line" />
      : <span className="text-xs font-semibold">{v}</span>;
  return (
    <div className="mt-10">
      <h2 className="bz-title-2 text-center mb-4">مقارنة الميزات</h2>
      <div className="overflow-x-auto rounded-2xl border border-bz-line bg-white">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-bz-bg">
              <th className="text-start px-4 py-3">الميزة</th>
              {(['FREE', 'PRO', 'ENTERPRISE'] as const).map(k => <th key={k} className="px-3 py-3 text-center">{PLAN_CONFIGS[k].nameAr}</th>)}
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map(r => (
              <tr key={r.label} className={cn('border-t border-bz-line', r.highlight && 'bg-bz-brand-50/40')}>
                <td className="px-4 py-2.5">{r.label}{r.sub && <span className="block text-[11px] text-bz-muted">{r.sub}</span>}</td>
                <td className="text-center px-3">{cell(r.FREE)}</td>
                <td className="text-center px-3">{cell(r.PRO)}</td>
                <td className="text-center px-3">{cell(r.ENTERPRISE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  useDocumentTitle('الباقات والترقية');
  const setUser = useAuthStore(s => s.setUser);
  const authUser = useAuthStore(s => s.user);
  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [lastRequest, setLastRequest] = useState<MyRequest | null>(null);
  const [choice, setChoice] = useState<{ plan: PlanKey; cycle: BillingCycle } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api.get<{ data: Status }>('/api/billing/status'),
      api.get<{ data: PayConfig }>('/api/billing/payment-config', { noAuth: true }),
      api.get<{ data: MyRequest[] }>('/api/billing/my-requests').catch(() => ({ data: [] as MyRequest[] })),
    ]).then(([st, cfg, reqs]) => {
      setStatus(st.data); setConfig(cfg.data); setLastRequest(reqs.data[0] ?? null);
      // Keep the cached session plan in sync (expiry / approval may have changed it).
      if (authUser && authUser.plan !== st.data.plan) setUser({ ...authUser, plan: st.data.plan });
    }).catch(() => null);
  }, [authUser, setUser]);

  useEffect(() => { trackPage('upgrade'); track({ event: 'upgrade_clicked' }); }, []);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (plan: PlanKey, cycle: BillingCycle) => {
    if (plan === 'FREE') {
      if (!confirm('الانتقال للباقة المجانية؟ متجرك وبياناتك تبقى كما هي، وتتوقف ميزات الباقة المدفوعة.')) return;
      try { await api.post('/api/billing/downgrade', {}); toast.success('انتقلت للباقة المجانية'); load(); }
      catch (e) { toast.error((e as Error).message); }
      return;
    }
    if (status?.pendingRequest) { toast.error('لديك طلب دفع قيد المراجعة'); return; }
    setChoice({ plan, cycle });
  };

  if (!status || !config) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-bz-brand" /></div>;

  if (submitted) {
    return (
      <div className="text-center px-6 py-16 max-w-md mx-auto">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        <h2 className="bz-title-2 mt-4">تم استلام طلبك</h2>
        <p className="text-bz-muted mt-2 leading-7">نراجع التحويل ونفعّل باقتك ونرسل لك إشعاراً هنا فور التفعيل.</p>
        <button onClick={() => { setSubmitted(false); load(); }} className="bz-btn bz-btn-outline mt-6">العودة للباقات</button>
      </div>
    );
  }

  // Upgrade nudges tied to the merchant's billing moment.
  const nudge = (() => {
    if (status.billingCycle === 'MONTHLY' && status.monthlyPaymentsCount >= 2) {
      return { text: `حوّل للسنوي ووفّر حتى ${n(yearlySavingIQD(status.plan))} د.ع`, plan: status.plan, cycle: 'YEARLY' as BillingCycle };
    }
    if (status.billingCycle === 'YEARLY' && !status.lifetime && status.lifetimeSeatsLeft > 0) {
      const recent = status.lastYearlyPaidAt && Date.now() - new Date(status.lastYearlyPaidAt).getTime() <= 60 * 864e5;
      const nearRenewal = status.daysLeft !== null && status.daysLeft <= 30;
      if (recent || nearRenewal) return { text: 'انتقل للأبدي — يُخصم ما دفعته هذا العام من سعر الأبدي', plan: status.plan, cycle: 'LIFETIME' as BillingCycle };
    }
    if (status.billingCycle === 'LIFETIME' && status.plan === 'PRO') {
      return { text: `رقِّ أبدي الاحترافية إلى أبدي الأعمال بدفع الفرق فقط (${n(PLAN_CONFIGS.ENTERPRISE.prices.LIFETIME - PLAN_CONFIGS.PRO.prices.LIFETIME)} د.ع)`, plan: 'ENTERPRISE' as PlanKey, cycle: 'LIFETIME' as BillingCycle };
    }
    return null;
  })();

  const pr = status.pendingRequest;
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="bz-large-title">متجر متكامل بدون مبرمج — بسعر يناسب السوق العراقي</h1>
        <p className="text-bz-muted mt-2">الأسعار بالدينار وثابتة طوال مدة اشتراكك. ادفع بالتحويل المصرفي أو ZainCash.</p>
      </div>

      <div className="space-y-3 mb-8">
        <SubscriptionCard s={status} onPayNextInstallment={() => status.lifetime && setChoice({ plan: status.lifetime.target, cycle: 'LIFETIME' })} />
        {pr && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800 font-semibold">طلبك ({PLAN_CONFIGS[pr.planTarget]?.nameAr} — {CYCLE_AR[pr.cycle] ?? pr.cycle}{pr.installment ? ` ${pr.installment}/${LIFETIME_INSTALLMENTS}` : ''} — {n(pr.amount)} د.ع) قيد المراجعة.</p>
          </div>
        )}
        {!pr && lastRequest?.status === 'REJECTED' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="text-sm"><p className="font-bold text-red-700">لم نتمكن من تأكيد آخر دفعة</p>{lastRequest.adminNote && <p className="text-red-600">{lastRequest.adminNote}</p>}</div>
          </div>
        )}
        {nudge && !pr && (
          <button onClick={() => setChoice({ plan: nudge.plan, cycle: nudge.cycle })}
            className="w-full rounded-2xl bg-bz-ink text-white p-4 flex items-center gap-3 text-start hover:opacity-95">
            <Sparkles className="h-5 w-5 text-amber-300 flex-shrink-0" />
            <span className="flex-1 font-bold">{nudge.text}</span>
            <span className="text-sm opacity-80">التفاصيل ←</span>
          </button>
        )}
        {status.legacyPricing && status.billingCycle !== 'LIFETIME' && (
          <p className="text-sm text-center text-green-700 font-semibold">
            {status.plan !== 'FREE' && status.billingCycle === 'LEGACY' ? 'كمشترك قديم تبقى على سعرك الحالي حتى نهاية اشتراكك، ' : 'كمشترك قديم '}لك خصم 10% على الباقة الأبدية.
          </p>
        )}
      </div>

      <PricingPlans currentPlan={status.plan} onChoose={choose} />
      <CompareTable />

      {choice && <PayModal plan={choice.plan} cycle={choice.cycle} config={config} onClose={() => setChoice(null)} onDone={() => { setChoice(null); setSubmitted(true); }} />}
    </div>
  );
}
