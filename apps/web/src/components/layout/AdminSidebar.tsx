'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, ShoppingCart, BarChart2, ClipboardList, LogOut, Shield, Sparkles, Code2, Globe, Gift, CreditCard, Activity, CalendarCheck, ShoppingBag, Newspaper, AlertTriangle, GitCompare,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { NotificationBell } from './NotificationBell';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

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
    <aside style={{ width: 240, minHeight: '100vh', background: B.p, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Logo + Bell */}
      <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid rgba(255,255,255,.1)` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, background: B.a, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={16} color="#fff" /></div>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>StoreBuilder</span>
          </div>
          <NotificationBell variant="dark" />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 6 }}>لوحة الإدارة العليا</p>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
                fontSize: 13, fontWeight: active ? 700 : 500, textDecoration: 'none', transition: 'all .15s',
                background: active ? B.a : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,.65)',
              }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px', borderTop: `1px solid rgba(255,255,255,.1)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: B.a, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', margin: 0 }}>مشرف عام</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: 13, fontFamily: 'inherit', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={15} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
