import { PLAN_CONFIGS, discountPercent, perDay, yearlySaving, formatUSD, type PlanKey } from '@storebuilder/types';

type Props = {
  plan: PlanKey;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
  /** kept for compatibility with older callers */
  showCurrency?: boolean;
};

/** Compact monthly price (USD) with the yearly alternative underneath (lists, cards, compare page). */
export function PlanPrice({ plan, align = 'right', compact = false }: Props) {
  const cfg = PLAN_CONFIGS[plan];
  return (
    <div style={{ textAlign: align }}>
      {plan === 'FREE' ? (
        <div style={{ fontSize: compact ? 22 : 26, fontWeight: 900, color: '#0B3550' }}>مجاناً</div>
      ) : (
        <>
          <div style={{ fontSize: compact ? 18 : 22, fontWeight: 900, color: '#0B3550', lineHeight: 1.2 }}>
            <span dir="ltr">{formatUSD(cfg.prices.MONTHLY)}</span> <span style={{ fontSize: 12, fontWeight: 600, color: '#7A8A99' }}>/ شهرياً</span>
          </div>
          <div style={{ fontSize: 12, color: '#7A8A99', marginTop: 2 }}>نحو <span dir="ltr">{formatUSD(perDay(plan, 'MONTHLY'))}</span> يومياً</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#22B07D', marginTop: 4 }}>
            أو <s style={{ fontWeight: 400, color: '#7A8A99' }} dir="ltr">{formatUSD(cfg.listPrices.YEARLY)}</s> <span dir="ltr">{formatUSD(cfg.prices.YEARLY)}</span> سنوياً (خصم {discountPercent(plan, 'YEARLY')}%) — وفّر <span dir="ltr">{formatUSD(yearlySaving(plan))}</span>
          </div>
        </>
      )}
    </div>
  );
}
