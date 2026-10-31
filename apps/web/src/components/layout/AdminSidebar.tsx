'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, ShoppingCart, BarChart2, ClipboardList, LogOut, Shield, Sparkles, Code2, Globe, Gift, CreditCard, Activity, CalendarCheck, ShoppingBag, Newspaper, AlertTriangle, GitCompare,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { NotificationBell } from './NotificationBell';
import { cn } from '@/lib/utils';


const links = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { href: '/admin/merchants', label: 'التجار', icon: Users },
  { href: '/admin/stores', label: 'المتاجر', icon: Store },
  { href: '/admin/orders', label: 'الطلبات', icon: ShoppingCart },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart2 },
  { href: '/admin/merchant-analytics', label: 'تتبع التجار', icon: Activity },
  { href: '/admin/store-comparison', label: 'مقارنة المتاجر', icon: GitCompare },
  { href: '/admin/merchant-issues', label: 'تجار بحاجة متابعة', icon: AlertTriangle },
  { href: '/admin/articles', label: 'المقالات', icon: Newspaper },
  { href: '/admin/logs', label: 'سجل المراقبة', icon: ClipboardList },
  { href: '/admin/ai', label: 'الذكاء الاصطناعي', icon: Sparkles },
  { href: '/admin/widget', label: 'إعدادات الويدجت', icon: Code2 },
  { href: '/admin/marketplace', label: 'السوق', icon: Globe },
  { href: '/admin/loyalty',   label: 'برنامج الولاء',  icon: Gift },
  { href: '/admin/payments',  label: 'طلبات الدفع',   icon: CreditCard },
  { href: '/admin/subscriptions', label: 'الاشتراكات', icon: CalendarCheck },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-[270px] h-screen sticky top-0 flex flex-col flex-shrink-0 bg-b-ink text-white border-l-2 border-b-ink">
      <div className="p-4 border-b-2 border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-stretch border-2 border-white">
            <span className="bg-b-red px-2 flex items-center"><Shield className="h-4 w-4" strokeWidth={3} /></span>
            <span className="px-2.5 py-1 text-xl font-bold leading-none flex items-center">بازار</span>
          </div>
          <NotificationBell variant="dark" />
        </div>
        <p className="b-label mt-3 text-b-yellow">ROOT ACCESS — الإدارة العليا</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {links.map(({ href, label, icon: Icon, exact }, i) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 border-b border-white/15 text-[14px] font-medium',
                active ? 'bg-b-yellow text-b-ink' : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              <span className={cn('font-mono text-[11px] font-bold w-6', active ? 'text-b-ink' : 'text-white/40')}>{String(i + 1).padStart(2, '0')}</span>
              <Icon size={16} strokeWidth={2.5} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-white/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="h-9 w-9 bg-b-yellow text-b-ink flex items-center justify-center font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.name}</p>
            <p className="font-mono text-[11px] text-white/50">SUPER_ADMIN</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 h-11 border-t-2 border-white/20 font-bold text-b-red hover:bg-b-red hover:text-white">
          <LogOut size={16} strokeWidth={2.5} /> تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
