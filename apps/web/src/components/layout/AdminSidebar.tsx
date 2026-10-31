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
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true, tint: '#007AFF' },
  { href: '/admin/merchants', label: 'التجار', icon: Users, tint: '#FF9500' },
  { href: '/admin/stores', label: 'المتاجر', icon: Store, tint: '#34C759' },
  { href: '/admin/orders', label: 'الطلبات', icon: ShoppingCart, tint: '#FF3B30' },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart2, tint: '#5856D6' },
  { href: '/admin/merchant-analytics', label: 'تتبع التجار', icon: Activity, tint: '#30B0C7' },
  { href: '/admin/store-comparison', label: 'مقارنة المتاجر', icon: GitCompare, tint: '#AF52DE' },
  { href: '/admin/merchant-issues', label: 'تجار بحاجة متابعة', icon: AlertTriangle, tint: '#FF9500' },
  { href: '/admin/articles', label: 'المقالات', icon: Newspaper, tint: '#FF2D55' },
  { href: '/admin/logs', label: 'سجل المراقبة', icon: ClipboardList, tint: '#8E8E93' },
  { href: '/admin/ai', label: 'الذكاء الاصطناعي', icon: Sparkles, tint: '#AF52DE' },
  { href: '/admin/widget', label: 'إعدادات الويدجت', icon: Code2, tint: '#5856D6' },
  { href: '/admin/marketplace', label: 'السوق', icon: Globe, tint: '#32ADE6' },
  { href: '/admin/loyalty',   label: 'برنامج الولاء',  icon: Gift, tint: '#FF2D55' },
  { href: '/admin/payments',  label: 'طلبات الدفع',   icon: CreditCard, tint: '#34C759' },
  { href: '/admin/subscriptions', label: 'الاشتراكات', icon: CalendarCheck, tint: '#FFCC00' },
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
    <aside className="w-[280px] h-screen sticky top-0 flex flex-col flex-shrink-0 bg-ios-bg border-l border-[rgba(60,60,67,0.12)]">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-[10px] flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #3A3A3C, #1C1C1E)' }}>
              <Shield className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-[22px] font-bold leading-none text-gray-900">بازار</p>
              <p className="text-[12px] text-gray-500 mt-1">لوحة الإدارة العليا</p>
            </div>
          </div>
          <NotificationBell variant="light" />
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-0.5">
        {links.map(({ href, label, icon: Icon, exact, tint }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2 py-[7px] rounded-[10px] text-[15px] font-medium transition-colors',
                active ? 'bg-ios-blue text-white' : 'text-gray-900 hover:bg-[rgba(120,120,128,0.10)]',
              )}
            >
              <span className="ios-icon" style={{ background: active ? 'rgba(255,255,255,.2)' : tint }}>
                <Icon size={17} strokeWidth={2.25} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-2">
        <div className="bg-white rounded-[12px] flex items-center gap-3 px-3 py-2.5">
          <span className="h-10 w-10 rounded-full flex items-center justify-center text-white text-[15px] font-semibold"
            style={{ background: 'linear-gradient(160deg, #A2A2A7, #6E6E73)' }}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[12px] text-gray-500">مشرف عام</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="bg-white rounded-[12px] w-full flex items-center justify-center gap-2 py-3 text-[15px] font-medium text-ios-red active:bg-gray-100">
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
