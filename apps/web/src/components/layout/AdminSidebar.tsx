'use client';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, ShoppingCart, BarChart2, ClipboardList, LogOut, Shield, Sparkles, Code2, Globe, Gift, CreditCard, Activity, CalendarCheck, ShoppingBag, Newspaper, AlertTriangle, GitCompare,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { NotificationBell } from './NotificationBell';
import { ClayIcon, type ClayIconName } from '@/components/ui/ClayIcon';
import { cn } from '@/lib/utils';


const links = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true, clay: 'apps' as ClayIconName },
  { href: '/admin/merchants', label: 'التجار', icon: Users, clay: 'users' as ClayIconName },
  { href: '/admin/stores', label: 'المتاجر', icon: Store, clay: 'store' as ClayIconName },
  { href: '/admin/orders', label: 'الطلبات', icon: ShoppingCart, clay: 'cart' as ClayIconName },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart2, clay: 'pie-chart' as ClayIconName },
  { href: '/admin/merchant-analytics', label: 'تتبع التجار', icon: Activity, clay: 'growth' as ClayIconName },
  { href: '/admin/store-comparison', label: 'مقارنة المتاجر', icon: GitCompare, clay: 'search' as ClayIconName },
  { href: '/admin/merchant-issues', label: 'تجار بحاجة متابعة', icon: AlertTriangle, clay: 'support' as ClayIconName },
  { href: '/admin/articles', label: 'المقالات', icon: Newspaper, clay: 'documents' as ClayIconName },
  { href: '/admin/logs', label: 'سجل المراقبة', icon: ClipboardList, clay: 'calendar' as ClayIconName },
  { href: '/admin/ai', label: 'الذكاء الاصطناعي', icon: Sparkles, clay: 'star' as ClayIconName },
  { href: '/admin/widget', label: 'إعدادات الويدجت', icon: Code2, clay: 'link' as ClayIconName },
  { href: '/admin/marketplace', label: 'السوق', icon: Globe, clay: 'shopping-bag' as ClayIconName },
  { href: '/admin/loyalty',   label: 'برنامج الولاء',  icon: Gift, clay: 'heart' as ClayIconName },
  { href: '/admin/payments',  label: 'طلبات الدفع',   icon: CreditCard, clay: 'credit-card' as ClayIconName },
  { href: '/admin/subscriptions', label: 'الاشتراكات', icon: CalendarCheck, clay: 'wallet' as ClayIconName },
];

export function AdminSidebar() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-[264px] h-screen sticky top-0 flex flex-col flex-shrink-0 bg-white border-l border-bz-line">
      <div className="flex items-center justify-between px-5 h-16 border-b border-bz-line">
        <div className="flex items-center gap-2.5">
          <span className="h-10 w-10 rounded-xl bg-bz-ink flex items-center justify-center">
            <ClayIcon name="shield-check" size={28} />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold text-bz-ink">{t("بازار")}</p>
            <p className="text-[11px] text-bz-muted">{t("لوحة الإدارة العليا")}</p>
          </div>
        </div>
        <NotificationBell variant="light" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map(({ href, label, exact, clay }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 h-11 text-[14px] transition-colors',
                active
                  ? 'bg-bz-brand-50 text-bz-brand-600 font-bold before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-bz-brand'
                  : 'text-bz-ink-2 font-medium hover:bg-bz-bg hover:text-bz-ink',
              )}
            >
              <ClayIcon name={clay} size={26} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-bz-line">
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <span className="h-9 w-9 rounded-full bg-bz-ink text-white flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-bz-ink truncate">{user?.name}</p>
            <p className="text-[11px] text-bz-muted">{t("مشرف عام")}</p>
          </div>
          <LanguageSwitcher compact className="text-bz-muted text-xs" />
          <button onClick={handleLogout} title={t("تسجيل الخروج")} aria-label={t("تسجيل الخروج")}
            className="h-9 w-9 rounded-full flex items-center justify-center text-bz-muted hover:bg-[#FDECEC] hover:text-bz-red">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
