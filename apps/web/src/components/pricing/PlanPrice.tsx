import { PLAN_CONFIGS, type PlanKey } from '@storebuilder/types';

type Props = {
  plan: PlanKey;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
  showCurrency?: boolean;
};

export function PlanPrice({ plan, align = 'right', compact = false, showCurrency = true }: Props) {
  const cfg = PLAN_CONFIGS[plan];
  const discounted = cfg.firstYearPriceIQD ?? cfg.priceIQD;
  const currency = showCurrency ? ' د.ع' : '';

  return (
    <div style={{ textAlign: align }}>
      {plan === 'FREE' ? (
        <div style={{ fontSize: compact ? 22 : 26, fontWeight: 900, color: '#2F2E4B' }}>
          مجاناً
        </div>
      ) : (
        <>
          <div style={{ fontSize: compact ? 18 : 22, fontWeight: 900, color: '#059669', lineHeight: 1.2 }}>
            {discounted.toLocaleString('en')}{currency}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginTop: 2 }}>
            بعد الخصم للسنة الأولى
          </div>
          <div style={{ fontSize: compact ? 12 : 13, color: '#6B6A83', marginTop: 4 }}>
            <span style={{ textDecoration: 'line-through' }}>{cfg.priceIQD.toLocaleString('en')}{currency}</span>
            <span style={{ marginRight: 6 }}>السعر الأصلي</span>
          </div>
        </>
      )}
    </div>
  );
}

