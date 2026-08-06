'use client';

import { Lock, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, getFeature, Plan, PLAN_LABELS, planAtLeast } from '@/lib/plan-features';

interface PlanGateProps {
  feature: string;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'overlay' | 'replace' | 'banner';
}

const UPGRADE_HREF = '/dashboard/settings?tab=billing';

function UpgradeCard({ hint, minPlan }: { hint: string; minPlan: Plan }) {
  return (
    <div className="relative rounded-2xl border-2 border-dashed overflow-hidden"
      style={{ borderColor: '#C4B5FD', background: '#FAF5FF' }}>
      <div className="absolute inset-0 backdrop-blur-[1px]" />
      <div className="relative flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#EDE9FE' }}>
          <Lock className="h-5 w-5" style={{ color: '#7C3AED' }} />
        </div>
        <div>
          <p className="font-bold text-sm mb-1" style={{ color: '#2F2E4B' }}>ميزة {PLAN_LABELS[minPlan]}</p>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">{hint}</p>
        </div>
        <a href={UPGRADE_HREF}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #DB6E93)' }}>
          <Zap className="h-3.5 w-3.5" />
          ارفع خطتك
        </a>
      </div>
    </div>
  );
}

function OverlayLock({ hint, minPlan }: { hint: string; minPlan: Plan }) {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-0 z-10 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-2 p-4"
        style={{ background: 'rgba(67,46,84,0.6)' }}>
        <Lock className="h-5 w-5 text-white" />
        <p className="text-xs font-semibold text-white text-center">{hint}</p>
        <a href={UPGRADE_HREF}
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
          style={{ background: '#DB6E93' }}>
          ارفع خطتك
        </a>
      </div>
    </div>
  );
}

export function PlanBanner({ feature }: { feature: string }) {
  const user = useAuthStore(s => s.user);
  const plan = (user?.plan ?? 'FREE') as Plan;
  const f = getFeature(feature);
  if (!f || planAtLeast(plan, f.minPlan)) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 border"
      style={{ background: '#FEF3C7', borderColor: '#FCD34D' }}>
      <Zap className="h-4 w-4 flex-shrink-0" style={{ color: '#D97706' }} />
      <p className="text-sm flex-1" style={{ color: '#92400E' }}>{f.upgradeHint}</p>
      <a href={UPGRADE_HREF}
        className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition hover:opacity-90"
        style={{ background: '#D97706' }}>
        ارفع الآن
      </a>
    </div>
  );
}

export function PlanGate({ feature, children, fallback, mode = 'replace' }: PlanGateProps) {
  const user = useAuthStore(s => s.user);
  const plan = (user?.plan ?? 'FREE') as Plan;

  if (canUseFeature(plan, feature)) return <>{children}</>;

  const f = getFeature(feature);
  const hint = f?.upgradeHint ?? 'ارفع خطتك للوصول إلى هذه الميزة';
  const minPlan = f?.minPlan ?? 'PRO';

  if (fallback) return <>{fallback}</>;
  if (mode === 'overlay') return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 select-none">{children}</div>
      <OverlayLock hint={hint} minPlan={minPlan} />
    </div>
  );
  if (mode === 'banner') return <PlanBanner feature={feature} />;
  return <UpgradeCard hint={hint} minPlan={minPlan} />;
}
