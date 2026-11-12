'use client';

import { useT, LocaleRoot } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X, Clock, CheckCircle2, XCircle, Crown, Check, Minus, Building2, Smartphone, Sparkles, CreditCard } from 'lucide-react';
import {
  PLAN_CONFIGS, PLAN_COMPARISON, BILLING_CYCLE_LABELS, LIFETIME_INSTALLMENTS, discountPercent, yearlySaving, formatUSD,
  type PlanKey, type BillingCycle,
} from '@storebuilder/types';
import { api } from '@/lib/api';
import { trackPage, track } from '@/lib/track';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PricingPlans } from '@/components/pricing/PricingPlans';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { cn } from '@/lib/utils';

const n = (v: number) => formatUSD(v);

interface PayConfig {
  qrImageUrl: string | null; bankName: string; accountName: string; accountNumber: string; instructions: string;
  zainCashNumber: string | null; zainCashName: string | null;
  usdToIqd: number;
  gateway: { enabled: boolean; label?: string; test?: boolean };
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
  const t = useT();
  const [installments, setInstallments] = useState<1 | 3>(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'GATEWAY' | 'BANK' | 'ZAINCASH'>(config.gateway.enabled ? 'GATEWAY' : 'BANK');
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
      if (method === 'GATEWAY') {
        // Online payment: the gateway's page takes the payment and the plan activates automatically.
        const r = await api.post<{ data: { redirectUrl: string } }>('/api/billing/checkout', { plan, cycle, installments });
        track({ event: 'payment_requested', meta: { plan, cycle, installments, method: 'gateway' } });
        window.location.href = r.data.redirectUrl;
        return;
      }
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
            <p className="text-xs text-bz-muted">{t("الاشتراك في")}</p>
            <h2 className="text-lg font-extrabold text-bz-ink">{t(cfg.nameAr)} — {t(BILLING_CYCLE_LABELS[cycle])}</h2>
          </div>
          <button onClick={onClose} aria-label={t("إغلاق")} className="h-9 w-9 rounded-full bg-bz-bg flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {cycle === 'LIFETIME' && !error && quote?.cycle !== 'LIFETIME_UPGRADE' && (
            <div className="grid grid-cols-2 gap-2">
              {([1, 3] as const).map(k => (
                <button key={k} onClick={() => setInstallments(k)}
                  className={cn('rounded-2xl border-2 p-3 text-sm font-bold', installments === k ? 'border-bz-brand bg-bz-brand-50 text-bz-brand-600' : 'border-bz-line text-bz-ink-2')}>
                  {k === 1 ? t("دفعة واحدة") : t("{0} دفعات خلال 60 يوماً", [LIFETIME_INSTALLMENTS])}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-bz-bg p-4 text-center">
            {error ? <p className="text-sm text-red-600 font-semibold">{error}</p>
              : !quote ? <Loader2 className="h-5 w-5 animate-spin mx-auto text-bz-brand" />
              : (
                <>
                  <p className="text-xs text-bz-muted">{quote.installment ? t("المبلغ المطلوب الآن (الدفعة {0} من {1})", [quote.installment, quote.installmentsTotal ?? 3]) : t("المبلغ المطلوب")}</p>
                  <p className="text-3xl font-extrabold text-bz-ink tabular-nums mt-1" dir="ltr">{n(quote.amount)}</p>
                  {method !== 'GATEWAY' && <p className="text-xs text-bz-muted">≈ {Math.round(quote.amount * config.usdToIqd).toLocaleString('en-US')} {' '}{t("د.ع بالتحويل")}</p>}
                  {quote.note && <p className="text-xs text-green-700 font-semibold mt-1">{quote.note}</p>}
                  {(quote.cycle === 'YEARLY' || quote.cycle === 'LIFETIME') && (
                    <p className="text-xs mt-1"><span className="line-through text-bz-muted" dir="ltr">{n(cfg.listPrices[cycle])}</span> <span className="font-bold text-red-500">{t("خصم")}{' '}{discountPercent(plan, cycle)}%</span></p>
                  )}
                  {cycle === 'YEARLY' && <p className="text-xs text-green-700 font-semibold mt-1">{t("وفّرت")}{' '}{n(yearlySaving(plan))} {' '}{t("مقارنة بالشهري")}</p>}
                </>
              )}
          </div>

          {!error && (
            <>
              <div className={cn('grid gap-2', config.gateway.enabled ? 'grid-cols-3' : 'grid-cols-2')}>
                {config.gateway.enabled && (
                  <button onClick={() => setMethod('GATEWAY')} className={cn('rounded-2xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2', method === 'GATEWAY' ? 'border-bz-ink' : 'border-bz-line text-bz-muted')}>
                    <CreditCard className="h-4 w-4" /> {' '}{t("دفع إلكتروني")}
                  </button>
                )}
                <button onClick={() => setMethod('BANK')} className={cn('rounded-2xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2', method === 'BANK' ? 'border-bz-ink' : 'border-bz-line text-bz-muted')}>
                  <Building2 className="h-4 w-4" /> {' '}{t("تحويل مصرفي")}
                </button>
                <button onClick={() => setMethod('ZAINCASH')} className={cn('rounded-2xl border-2 p-3 text-sm font-bold flex items-center justify-center gap-2', method === 'ZAINCASH' ? 'border-bz-ink' : 'border-bz-line text-bz-muted')}>
                  <Smartphone className="h-4 w-4" /> ZainCash
                </button>
              </div>
              {method === 'GATEWAY' ? (
                <div className="rounded-2xl border border-bz-line p-4 text-sm leading-7">
                  <p>{t("ستنتقل إلى صفحة الدفع الآمنة ({0})، وتتفعّل باقتك تلقائياً فور نجاح الدفع.", [config.gateway.label ?? t("الدفع الإلكتروني")])}</p>
                  {config.gateway.test && <p className="text-xs text-amber-700 mt-1">{t("بوابة تجريبية — لا يُخصم أي مبلغ حقيقي.")}</p>}
                </div>
              ) : (
              <div className="rounded-2xl border border-bz-line p-4 text-sm leading-7">
                {method === 'BANK' ? (
                  <>
                    {config.qrImageUrl && <img src={config.qrImageUrl} alt={t("رمز QR للدفع")} className="h-40 w-40 mx-auto object-contain mb-2" />}
                    <p><span className="text-bz-muted">{t("المصرف:")}</span> {config.bankName}</p>
                    <p><span className="text-bz-muted">{t("اسم الحساب:")}</span> {config.accountName}</p>
                    <p><span className="text-bz-muted">{t("رقم الحساب:")}</span> <span dir="ltr">{config.accountNumber}</span></p>
                  </>
                ) : config.zainCashNumber ? (
                  <>
                    <p><span className="text-bz-muted">{t("رقم ZainCash:")}</span> <span dir="ltr" className="font-bold">{config.zainCashNumber}</span></p>
                    {config.zainCashName && <p><span className="text-bz-muted">{t("الاسم:")}</span> {config.zainCashName}</p>}
                  </>
                ) : <p className="text-bz-muted">{t("تواصل مع دعم بازار لاستلام رقم ZainCash.")}</p>}
                <p className="text-xs text-bz-muted mt-2">{config.instructions}</p>
              </div>
              )}
              {method !== 'GATEWAY' && <input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder={t("رقم العملية أو آخر 4 أرقام (اختياري)")}
                className="w-full h-11 px-4 rounded-2xl border border-bz-line text-sm" />}
              <button onClick={pay} disabled={busy || !quote} className="bz-btn w-full h-12 text-base">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : method === 'GATEWAY' ? <CreditCard className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {method === 'GATEWAY' ? t("ادفع الآن") : t("دفعت الآن")}
              </button>
              <p className="text-[11px] text-bz-muted text-center">{method === 'GATEWAY' ? t("تتفعّل باقتك فور نجاح الدفع. استرداد خلال 14 يوماً.") : t("نراجع التحويل ونفعّل باقتك عادةً خلال ساعات. استرداد خلال 14 يوماً.")}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({ s, onPayNextInstallment }: { s: Status; onPayNextInstallment: () => void }) {
  const t = useT();
  const cfg = PLAN_CONFIGS[s.plan];
  const expires = s.planExpiresAt ? new Date(s.planExpiresAt).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  return (
    <div className="bz-card p-5 flex flex-wrap items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-bz-brand-50 flex items-center justify-center"><Crown className="h-6 w-6 text-bz-brand" /></div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-xs text-bz-muted">{t("باقتك الحالية")}</p>
        <p className="text-lg font-extrabold text-bz-ink">
          {t(cfg.nameAr)}
          {s.billingCycle && <span className="text-sm font-semibold text-bz-muted"> · {t(CYCLE_AR[s.billingCycle] ?? s.billingCycle)}</span>}
        </p>
        {s.billingCycle === 'TRIAL' && s.daysLeft !== null && (
          <p className="text-sm text-amber-700 font-semibold">{t("بقي")}{' '}{s.daysLeft} {' '}{t("يوماً من تجربة الأعمال — بعدها ينتقل متجرك للمجانية")}</p>
        )}
        {s.billingCycle !== 'TRIAL' && expires && <p className="text-sm text-bz-muted">{t("يتجدد أو ينتهي في")}{' '}{expires} ({s.daysLeft} {' '}{t("يوماً)")}</p>}
        {s.billingCycle === 'LIFETIME' && <p className="text-sm text-green-700 font-semibold">{t("اشتراك أبدي — لا تجديد")}</p>}
      </div>
      {s.lifetime && (
        <div className="w-full sm:w-auto">
          <p className="text-sm font-semibold text-bz-ink">{t("الأبدي بالتقسيط:")}{' '}{s.lifetime.paid} {' '}{t("من")}{' '}{s.lifetime.of} {' '}{t("دفعات")}</p>
          <div className="h-2 rounded-full bg-bz-bg mt-1.5 overflow-hidden"><div className="h-full bg-bz-brand" style={{ width: `${(s.lifetime.paid / s.lifetime.of) * 100}%` }} /></div>
          {!s.pendingRequest && <button onClick={onPayNextInstallment} className="bz-btn h-9 text-sm mt-2">{t("ادفع الدفعة")}{' '}{s.lifetime.paid + 1}</button>}
        </div>
      )}
    </div>
  );
}

function CompareTable() {
  const t = useT();
  const cell = (v: boolean | string | null) =>
    v === true ? <Check className="h-4 w-4 mx-auto text-green-600" strokeWidth={3} />
      : v === false || v === null ? <Minus className="h-4 w-4 mx-auto text-bz-line" />
      : <span className="text-xs font-semibold">{v}</span>;
  return (
    <div className="mt-10">
      <h2 className="bz-title-2 text-center mb-4">{t("مقارنة الميزات")}</h2>
      <div className="overflow-x-auto rounded-2xl border border-bz-line bg-white">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-bz-bg">
              <th className="text-start px-4 py-3">{t("الميزة")}</th>
              {(['FREE', 'PRO', 'ENTERPRISE'] as const).map(k => <th key={k} className="px-3 py-3 text-center">{t(PLAN_CONFIGS[k].nameAr)}</th>)}
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map(r => (
              <tr key={r.label} className={cn('border-t border-bz-line', r.highlight && 'bg-bz-brand-50/40')}>
                <td className="px-4 py-2.5">{t(r.label)}{r.sub && <span className="block text-[11px] text-bz-muted">{t(r.sub)}</span>}</td>
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
  const t = useT();
  useDocumentTitle(t("الباقات والترقية"));
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
  // Back from the payment gateway: ?paid=<request> or ?cancelled=<request>
  const [gatewayReturn, setGatewayReturn] = useState<'paid' | 'cancelled' | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('paid')) setGatewayReturn('paid');
    else if (q.get('cancelled')) setGatewayReturn('cancelled');
  }, []);

  const choose = async (plan: PlanKey, cycle: BillingCycle) => {
    if (plan === 'FREE') {
      if (!confirm(t("الانتقال للباقة المجانية؟ متجرك وبياناتك تبقى كما هي، وتتوقف ميزات الباقة المدفوعة."))) return;
      try { await api.post('/api/billing/downgrade', {}); toast.success(t("انتقلت للباقة المجانية")); load(); }
      catch (e) { toast.error((e as Error).message); }
      return;
    }
    if (status?.pendingRequest) { toast.error(t("لديك طلب دفع قيد المراجعة")); return; }
    setChoice({ plan, cycle });
  };

  if (!status || !config) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-bz-brand" /></div>;

  if (submitted) {
    return (
      <div className="text-center px-6 py-16 max-w-md mx-auto">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        <h2 className="bz-title-2 mt-4">{t("تم استلام طلبك")}</h2>
        <p className="text-bz-muted mt-2 leading-7">{t("نراجع التحويل ونفعّل باقتك ونرسل لك إشعاراً هنا فور التفعيل.")}</p>
        <button onClick={() => { setSubmitted(false); load(); }} className="bz-btn bz-btn-outline mt-6">{t("العودة للباقات")}</button>
      </div>
    );
  }

  // Upgrade nudges tied to the merchant's billing moment.
  const nudge = (() => {
    if (status.billingCycle === 'MONTHLY' && status.monthlyPaymentsCount >= 2) {
      return { text: t("حوّل للسنوي ووفّر حتى {0}", [n(yearlySaving(status.plan))]), plan: status.plan, cycle: 'YEARLY' as BillingCycle };
    }
    if (status.billingCycle === 'YEARLY' && !status.lifetime && status.lifetimeSeatsLeft > 0) {
      const recent = status.lastYearlyPaidAt && Date.now() - new Date(status.lastYearlyPaidAt).getTime() <= 60 * 864e5;
      const nearRenewal = status.daysLeft !== null && status.daysLeft <= 30;
      if (recent || nearRenewal) return { text: t("انتقل للأبدي — يُخصم ما دفعته هذا العام من سعر الأبدي"), plan: status.plan, cycle: 'LIFETIME' as BillingCycle };
    }
    if (status.billingCycle === 'LIFETIME' && status.plan === 'PRO') {
      return { text: t("رقِّ أبدي الاحترافية إلى أبدي الأعمال بدفع الفرق فقط ({0})", [n(PLAN_CONFIGS.ENTERPRISE.prices.LIFETIME - PLAN_CONFIGS.PRO.prices.LIFETIME)]), plan: 'ENTERPRISE' as PlanKey, cycle: 'LIFETIME' as BillingCycle };
    }
    return null;
  })();

  const pr = status.pendingRequest;
  return (
    <LocaleRoot className="px-4 sm:px-6 lg:px-8 pt-6 pb-16 max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="bz-large-title">{t("متجر متكامل بدون مبرمج — بسعر يناسب السوق العراقي")}</h1>
        <p className="text-bz-muted mt-2">{t("الأسعار بالدولار وثابتة طوال مدة اشتراكك. ادفع إلكترونياً أو بالتحويل المصرفي أو ZainCash.")}</p>
      </div>

      <div className="space-y-3 mb-8">
        {gatewayReturn === 'paid' && (
          <div className="rounded-2xl border border-green-300 bg-green-50 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800 font-semibold">{t("تم الدفع بنجاح — باقتك مفعّلة الآن.")}</p>
          </div>
        )}
        {gatewayReturn === 'cancelled' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 font-semibold">{t("لم يكتمل الدفع، ولم يُخصم أي مبلغ. يمكنك المحاولة مرة أخرى.")}</p>
          </div>
        )}
        <SubscriptionCard s={status} onPayNextInstallment={() => status.lifetime && setChoice({ plan: status.lifetime.target, cycle: 'LIFETIME' })} />
        {pr && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800 font-semibold">{t("طلبك ({0} — {1}{2} — {3}) قيد المراجعة.", [t(PLAN_CONFIGS[pr.planTarget]?.nameAr ?? pr.planTarget), t(CYCLE_AR[pr.cycle] ?? pr.cycle), pr.installment ? ` ${pr.installment}/${LIFETIME_INSTALLMENTS}` : '', n(pr.amount)])}</p>
          </div>
        )}
        {!pr && lastRequest?.status === 'REJECTED' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="text-sm"><p className="font-bold text-red-700">{t("لم نتمكن من تأكيد آخر دفعة")}</p>{lastRequest.adminNote && <p className="text-red-600">{lastRequest.adminNote}</p>}</div>
          </div>
        )}
        {nudge && !pr && (
          <button onClick={() => setChoice({ plan: nudge.plan, cycle: nudge.cycle })}
            className="w-full rounded-2xl bg-bz-ink text-white p-4 flex items-center gap-3 text-start hover:opacity-95">
            <Sparkles className="h-5 w-5 text-amber-300 flex-shrink-0" />
            <span className="flex-1 font-bold">{nudge.text}</span>
            <span className="text-sm opacity-80">{t("التفاصيل ←")}</span>
          </button>
        )}
        {status.legacyPricing && status.billingCycle !== 'LIFETIME' && (
          <p className="text-sm text-center text-green-700 font-semibold">
            {status.plan !== 'FREE' && status.billingCycle === 'LEGACY' ? t("كمشترك قديم تبقى على سعرك الحالي حتى نهاية اشتراكك، ") : t("كمشترك قديم ")}{t("لك خصم 10% على الباقة الأبدية.")}
          </p>
        )}
      </div>

      <PricingPlans currentPlan={status.plan} onChoose={choose} />
      <CompareTable />

      {choice && <PayModal plan={choice.plan} cycle={choice.cycle} config={config} onClose={() => setChoice(null)} onDone={() => { setChoice(null); setSubmitted(true); }} />}
    </LocaleRoot>
  );
}
