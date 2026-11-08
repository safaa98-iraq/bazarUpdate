import Link from 'next/link';
import { getFeature, PLAN_LABELS } from '@/lib/plan-features';
import { ClayIcon } from '@/components/ui/ClayIcon';

/** Friendly "upgrade to unlock" card for a plan-gated feature page. */
export function UpgradeNotice({ feature }: { feature: string }) {
  const f = getFeature(feature);
  return (
    <div className="bz-card p-8 flex flex-wrap items-center gap-6 bg-gradient-to-l from-bz-brand-50 to-white">
      <ClayIcon name="lock" size={72} />
      <div className="flex-1 min-w-[220px]">
        <p className="bz-headline">{f?.description} — باقة {f ? PLAN_LABELS[f.minPlan] : ''}</p>
        <p className="text-sm text-bz-muted mt-1">{f?.upgradeHint}</p>
      </div>
      <Link href="/dashboard/upgrade" className="bz-btn">ترقية الباقة</Link>
    </div>
  );
}
