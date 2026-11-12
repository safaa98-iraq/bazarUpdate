'use client';

/**
 * The pricing table used on the landing page and in the dashboard upgrade page.
 * Outcome first (headline + who it's for), then the price for the chosen billing cycle,
 * then the features as proof. Lifetime is listed first and yearly is preselected.
 * Prices are in US dollars; every text goes through t() (Arabic / English / Kurdish).
 */
import { useEffect, useState } from 'react';
import { Check, Lock, ShieldCheck, Wallet, Clock3 } from 'lucide-react';
import {
  PLAN_CONFIGS, PLAN_ORDER, CYCLE_PERKS, TRIAL_DAYS, REFUND_DAYS, LIFETIME_INSTALLMENTS,
  cycleDiscountPercent, discountPercent, yearlySaving, perDay, formatUSD, type PlanKey, type BillingCycle,
} from '@storebuilder/types';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function useLifetimeSeats() {
  const [seats, setSeats] = useState<{ left: number; of: number } | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/api/billing/lifetime-seats`).then(r => r.json()).then(r => r?.data && setSeats(r.data)).catch(() => null);
  }, []);
  return seats;
}

export function CycleSwitch({ value, onChange }: { value: BillingCycle; onChange: (c: BillingCycle) => void }) {
  const t = useT();
  const cycles: { key: BillingCycle; label: string; tag?: string }[] = [
    { key: 'LIFETIME', label: t('أبدي'), tag: t('خصم {0}%', [cycleDiscountPercent('LIFETIME')]) },
    { key: 'YEARLY', label: t('سنوي'), tag: t('الأفضل قيمة · خصم {0}%', [cycleDiscountPercent('YEARLY')]) },
    { key: 'MONTHLY', label: t('شهري') },
  ];
  return (
    <div role="tablist" aria-label={t('مدة الدفع')} className="inline-flex p-1 rounded-2xl bg-white border border-bz-line shadow-sm max-w-full overflow-x-auto">
      {cycles.map(c => (
        <button key={c.key} role="tab" aria-selected={value === c.key} onClick={() => onChange(c.key)}
          className={cn('relative inline-flex items-center gap-1.5 px-4 sm:px-6 h-10 rounded-xl text-sm font-bold transition whitespace-nowrap',
            value === c.key ? 'bg-bz-ink text-white' : 'text-bz-ink-2 hover:bg-bz-bg')}>
          <span>{c.label}</span>
          {c.tag && <span className={cn('text-[10px] leading-none px-1.5 py-1 rounded-full', value === c.key ? 'bg-white/20' : 'bg-green-100 text-green-700')}>{c.tag}</span>}
        </button>
      ))}
    </div>
  );
}

function PriceBlock({ plan, cycle, seatsLeft }: { plan: PlanKey; cycle: BillingCycle; seatsLeft: number | null }) {
  const t = useT();
  const cfg = PLAN_CONFIGS[plan];
  if (plan === 'FREE') {
    return (
      <div>
        <div className="text-3xl font-extrabold text-bz-ink">{t('مجاناً')}</div>
        <p className="text-xs text-bz-muted mt-1">{t('بدون بطاقة وبدون مدة')}</p>
      </div>
    );
  }
  const price = cfg.prices[cycle];
  const list = cfg.listPrices[cycle];
  const pct = discountPercent(plan, cycle);
  return (
    <div>
      {pct > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-bz-muted line-through tabular-nums" dir="ltr">{formatUSD(list)}</span>
          <span className="text-[11px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{t('خصم {0}%', [pct])}</span>
        </div>
      )}
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold text-bz-ink tabular-nums" dir="ltr">{formatUSD(price)}</span>
        <span className="text-sm text-bz-muted">{cycle === 'MONTHLY' ? t('/ شهرياً') : cycle === 'YEARLY' ? t('/ سنوياً') : t('دفعة واحدة')}</span>
      </div>
      {cycle === 'MONTHLY' && <p className="text-xs text-bz-muted mt-1">{t('نحو {0} يومياً', [formatUSD(perDay(plan, 'MONTHLY'))])}</p>}
      {cycle === 'YEARLY' && (
        <p className="text-xs mt-1">
          <span className="font-bold text-green-700">{t('وفّر {0}', [formatUSD(yearlySaving(plan))])}</span>
          <span className="text-bz-muted"> · {t('نحو {0} يومياً', [formatUSD(perDay(plan, 'YEARLY'))])}</span>
        </p>
      )}
      {cycle === 'LIFETIME' && (
        <p className="text-xs text-bz-muted mt-1 leading-5">
          {t('ادفع مرة واحدة واستخدمها ما دامت المنصة تعمل · أو {0} دفعات خلال 60 يوماً', [LIFETIME_INSTALLMENTS])}
          {seatsLeft !== null && <span className="block font-bold text-amber-700">{t('بقي {0} مقعداً من أول 100 تاجر', [seatsLeft])}</span>}
        </p>
      )}
    </div>
  );
}

export interface PricingPlansProps {
  /** Highlight the merchant's current plan (dashboard). */
  currentPlan?: PlanKey;
  /** Called when a paid plan button is pressed; when absent the buttons link to /register. */
  onChoose?: (plan: PlanKey, cycle: BillingCycle) => void;
  initialCycle?: BillingCycle;
  /** Plans the merchant cannot buy right now (e.g. already lifetime) with the reason. */
  disabled?: Partial<Record<PlanKey, string>>;
}

export function PricingPlans({ currentPlan, onChoose, initialCycle = 'YEARLY', disabled = {} }: PricingPlansProps) {
  const t = useT();
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const seats = useLifetimeSeats();
  const soldOut = cycle === 'LIFETIME' && seats?.left === 0;

  return (
    <div>
      <div className="flex justify-center">
        <CycleSwitch value={cycle} onChange={setCycle} />
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-8 items-stretch">
        {PLAN_ORDER.map(key => {
          const cfg = PLAN_CONFIGS[key];
          const featured = key === 'PRO';
          const isCurrent = currentPlan === key;
          const reason = disabled[key];
          const blocked = key !== 'FREE' && (soldOut || !!reason);
          return (
            <div key={key} data-plan-card
              className={cn('relative flex flex-col rounded-3xl p-6 border bg-white',
                featured ? 'border-bz-brand shadow-[0_18px_40px_rgba(32,169,244,0.18)] md:-translate-y-2' : 'border-bz-line')}>
              {cfg.badge && (
                <span className="absolute -top-3 start-6 text-xs font-bold bg-bz-brand text-white px-3 py-1 rounded-full">{t(cfg.badge)}</span>
              )}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-extrabold text-bz-ink">{t(cfg.nameAr)}</h3>
                {isCurrent && <span className="bz-chip bg-bz-brand-50 text-bz-brand-600 text-xs">{t('باقتك الحالية')}</span>}
              </div>
              <p className="text-xs text-bz-muted mt-1">{t(cfg.audience)}</p>
              <p className="text-[15px] font-bold text-bz-ink mt-3 leading-7">{t(cfg.headline)}</p>

              <div className="mt-4 pb-4 border-b border-bz-line">
                <PriceBlock plan={key} cycle={cycle} seatsLeft={seats?.left ?? null} />
              </div>

              <ul className="mt-4 space-y-2 flex-1">
                {cfg.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-bz-ink-2 leading-6">
                    <Check className="h-4 w-4 mt-1 flex-shrink-0 text-green-600" strokeWidth={3} />
                    <span>{t(f)}</span>
                  </li>
                ))}
              </ul>

              {onChoose ? (
                <button
                  onClick={() => onChoose(key, cycle)}
                  disabled={isCurrent && key === 'FREE' || blocked}
                  title={reason}
                  className={cn('mt-6 h-12 w-full rounded-2xl font-bold transition disabled:opacity-50',
                    featured ? 'bg-bz-brand text-white hover:bg-bz-brand-600' : 'border-2 border-bz-ink text-bz-ink hover:bg-bz-bg')}>
                  {key === 'FREE' ? (isCurrent ? t('باقتك الحالية') : t('الانتقال للمجانية')) : reason ? reason : soldOut ? t('نفدت المقاعد الأبدية') : isCurrent ? t('تجديد / تغيير المدة') : t(cfg.cta)}
                </button>
              ) : (
                <a href="/register"
                  className={cn('mt-6 h-12 w-full rounded-2xl font-bold flex items-center justify-center transition',
                    featured ? 'bg-bz-brand text-white hover:bg-bz-brand-600' : 'border-2 border-bz-ink text-bz-ink hover:bg-bz-bg')}>
                  {key === 'FREE' ? t(cfg.cta) : t('جرّب {0} مجاناً', [t(cfg.nameAr)])}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk removal + payment */}
      <div className="grid sm:grid-cols-3 gap-3 mt-6 text-sm">
        <div className="flex items-center gap-2 rounded-2xl bg-white border border-bz-line px-4 py-3">
          <Clock3 className="h-5 w-5 text-bz-brand flex-shrink-0" />
          <span>{t('باقة الأعمال مجاناً {0} يوماً لكل متجر جديد', [TRIAL_DAYS])}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white border border-bz-line px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span>{t('استرداد خلال {0} يوماً، والنزول للمجانية في أي وقت دون فقدان متجرك', [REFUND_DAYS])}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white border border-bz-line px-4 py-3">
          <Wallet className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>{t('الأسعار بالدولار وثابتة طوال اشتراكك — ادفع إلكترونياً أو بالتحويل')}</span>
        </div>
      </div>

      {/* What the billing cycle adds */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-bz-line bg-white">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-bz-bg text-bz-ink-2">
              <th className="text-start font-bold px-4 py-3">{t('مزايا حسب مدة الدفع (الباقتان المدفوعتان)')}</th>
              <th className="font-bold px-3">{t('أبدي')}</th>
              <th className="font-bold px-3">{t('سنوي')}</th>
              <th className="font-bold px-3">{t('شهري')}</th>
            </tr>
          </thead>
          <tbody>
            {CYCLE_PERKS.map(r => (
              <tr key={r.label} className="border-t border-bz-line">
                <td className="px-4 py-3 text-bz-ink">{t(r.label)}</td>
                {(['LIFETIME', 'YEARLY', 'MONTHLY'] as const).map(c => (
                  <td key={c} className={cn('text-center px-3', r[c] === 'لا' ? 'text-bz-muted' : 'text-bz-ink font-semibold')}>
                    {r[c] === 'لا' ? <Lock className="h-3.5 w-3.5 inline text-bz-muted" /> : t(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
