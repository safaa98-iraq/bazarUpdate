'use client';

/**
 * Upgrade nudges tied to moments the merchant actually feels:
 *  - trial countdown (Business trial for new stores),
 *  - monthly order allowance running out on Free (40 of 50 → warning),
 *  - abandoned carts they can't see on Free.
 * Also turns any "upgrade your plan" API error into a toast with an upgrade button.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Clock3, TrendingUp, ShoppingBasket, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';

interface Usage {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'; billingCycle: string | null; daysLeft: number | null;
  orders: { used: number; limit: number }; products: { used: number; limit: number }; abandonedCarts: number;
}

export function useUsage() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const [usage, setUsage] = useState<Usage | null>(null);
  useEffect(() => {
    if (!user || user.role !== 'MERCHANT') return;
    api.get<{ data: Usage | null }>('/api/billing/usage').then(r => {
      setUsage(r.data);
      // Plan can change server-side (trial ended, payment approved) — keep the cached session in sync.
      if (r.data && user.plan !== r.data.plan) setUser({ ...user, plan: r.data.plan });
    }).catch(() => null);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return usage;
}

/** Slim banner at the top of every dashboard page. */
export function PlanBanner() {
  const usage = useUsage();
  const [hidden, setHidden] = useState(false);
  if (!usage || hidden) return null;

  let content: React.ReactNode = null;
  if (usage.billingCycle === 'TRIAL' && usage.daysLeft !== null) {
    content = (
      <>
        <Clock3 className="h-4 w-4 flex-shrink-0" />
        <span>بقي <b>{usage.daysLeft}</b> يوماً من تجربة باقة الأعمال. بعدها ينتقل متجرك للمجانية — بياناتك محفوظة.</span>
        <Link href="/dashboard/upgrade" className="ms-auto font-bold underline whitespace-nowrap">اشترك الآن</Link>
      </>
    );
  } else if (usage.plan === 'FREE' && usage.orders.limit > 0 && usage.orders.used >= Math.floor(usage.orders.limit * 0.8)) {
    const left = Math.max(0, usage.orders.limit - usage.orders.used);
    content = (
      <>
        <TrendingUp className="h-4 w-4 flex-shrink-0" />
        <span>{left > 0 ? <>متجرك ينمو — بقي <b>{left}</b> طلبات هذا الشهر في الباقة المجانية.</> : <>وصلت لحد {usage.orders.limit} طلباً هذا الشهر — الطلبات الجديدة متوقفة حتى ترقيتك.</>}</span>
        <Link href="/dashboard/upgrade" className="ms-auto font-bold underline whitespace-nowrap">طلبات بلا حد</Link>
      </>
    );
  }
  if (!content) return null;
  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 text-sm bg-amber-50 text-amber-900 border-b border-amber-200">
      {content}
      <button onClick={() => setHidden(true)} aria-label="إخفاء" className="p-1 opacity-60 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

/** Card for the dashboard home: Free plan usage + abandoned carts they can't see yet. */
export function FreeUsageCard() {
  const usage = useUsage();
  if (!usage || usage.plan !== 'FREE') return null;
  const pct = (used: number, limit: number) => Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="bz-card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'الطلبات هذا الشهر', ...usage.orders },
          { label: 'المنتجات', ...usage.products },
        ].map(m => (
          <div key={m.label}>
            <div className="flex justify-between text-sm"><span className="text-bz-muted">{m.label}</span><span className="font-bold tabular-nums">{m.used} / {m.limit}</span></div>
            <div className="h-2 rounded-full bg-bz-bg mt-1.5 overflow-hidden">
              <div className={`h-full ${pct(m.used, m.limit) >= 80 ? 'bg-amber-500' : 'bg-bz-brand'}`} style={{ width: `${pct(m.used, m.limit)}%` }} />
            </div>
          </div>
        ))}
      </div>
      {usage.abandonedCarts > 0 && (
        <Link href="/dashboard/upgrade" className="flex items-center gap-3 rounded-2xl bg-bz-brand-50 p-3 text-sm text-bz-brand-600 hover:opacity-90">
          <ShoppingBasket className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1"><b>{usage.abandonedCarts}</b> زبوناً تركوا سلالهم — اعرف من هم وتواصل معهم في الاحترافية</span>
          <span className="font-bold">←</span>
        </Link>
      )}
    </div>
  );
}

/** Listens for plan-limit errors from the API and offers the upgrade page. */
export function UpgradeErrorListener() {
  useEffect(() => {
    const onNeed = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      toast('ميزة من باقة أعلى', {
        id: 'upgrade-needed',
        description: msg,
        action: { label: 'الترقية', onClick: () => { window.location.href = '/dashboard/upgrade'; } },
      });
    };
    window.addEventListener('bz:upgrade-needed', onNeed);
    return () => window.removeEventListener('bz:upgrade-needed', onNeed);
  }, []);
  return null;
}
