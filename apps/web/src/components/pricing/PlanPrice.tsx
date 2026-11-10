import { PLAN_CONFIGS, perDayIQD, yearlySavingIQD, type PlanKey } from '@storebuilder/types';

type Props = {
  plan: PlanKey;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
  showCurrency?: boolean;
};

/** Compact monthly price with the yearly alternative underneath (lists, cards, compare page). */
export function PlanPrice({ plan, align = 'right', compact = false, showCurrency = true }: Props) {
  const cfg = PLAN_CONFIGS[plan];
  const currency = showCurrency ? ' د.ع' : '';
  return (
    <div style={{ textAlign: align }}>
      {plan === 'FREE' ? (
        <div style={{ fontSize: compact ? 22 : 26, fontWeight: 900, color: '#0B3550' }}>مجاناً</div>
      ) : (
        <>
          <div style={{ fontSize: compact ? 18 : 22, fontWeight: 900, color: '#0B3550', lineHeight: 1.2 }}>
            {cfg.prices.MONTHLY.toLocaleString('en')}{currency} <span style={{ fontSize: 12, fontWeight: 600, color: '#7A8A99' }}>/ شهرياً</span>
          </div>
          <div style={{ fontSize: 12, color: '#7A8A99', marginTop: 2 }}>أقل من {perDayIQD(plan, 'MONTHLY').toLocaleString('en')} د.ع يومياً</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#22B07D', marginTop: 4 }}>
            أو <s style={{ fontWeight: 400, color: '#7A8A99' }}>{cfg.listPrices.YEARLY.toLocaleString('en')}</s> {cfg.prices.YEARLY.toLocaleString('en')}{currency} سنوياً (خصم 35%) — وفّر {yearlySavingIQD(plan).toLocaleString('en')}{currency}
          </div>
        </>
      )}
    </div>
  );
}
