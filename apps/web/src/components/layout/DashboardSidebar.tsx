'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Settings, Palette, LogOut,
  MessageCircle, Lock, Crown, X, Megaphone, Tag, BadgeCheck, Gift,
  CreditCard, Percent, FilePlus2, Clock, ArrowLeft, Search, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, Plan, PLAN_LABELS } from '@/lib/plan-features';
import { NotificationBell } from './NotificationBell';

type NavLink = {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  exact?: boolean;
  feature?: string;
};

type NavSection = { title: string; code: string; links: NavLink[] };

const sections: NavSection[] = [
  {
    title: 'عام', code: 'SYS',
    links: [
      { href: '/dashboard', label: 'الرئيسية', desc: 'نظرة عامة على مبيعاتك وطلباتك', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'الكتالوج', code: 'CAT',
    links: [
      { href: '/dashboard/products',   label: 'منتجاتي',   desc: 'أضف منتجاتك وعدّل أسعارها وصورها',       icon: Package },
      { href: '/dashboard/categories', label: 'التصنيفات', desc: 'أنشئ تصنيفات تظهر في رأس متجرك',         icon: Tag },
      { href: '/dashboard/brands',     label: 'الماركات',  desc: 'أضف ماركات تجارية وصنّف منتجاتك تحتها', icon: BadgeCheck, feature: 'brands' },
    ],
  },
  {
    title: 'المبيعات', code: 'SAL',
    links: [
      { href: '/dashboard/orders',          label: 'الطلبات',         desc: 'تابع طلبات عملائك وحدّث حالتها',          icon: ShoppingCart },
      { href: '/dashboard/draft-orders',    label: 'طلبات يدوية',     desc: 'سجّل طلباً وصلك عبر واتساب أو انستغرام', icon: FilePlus2 },
      { href: '/dashboard/abandoned-carts', label: 'السلال المتروكة', desc: 'زبائن تركوا سلتهم قبل إتمام الطلب',       icon: Clock },
      { href: '/dashboard/chat',            label: 'رسائل العملاء',   desc: 'تحدث مع عملائك مباشرة من متجرك',          icon: MessageCircle, feature: 'chat' },
    ],
  },
  {
    title: 'النمو', code: 'GRW',
    links: [
      { href: '/dashboard/builder',    label: 'شكل المتجر',     desc: 'صمّم متجرك وأضف البانرات الترويجية', icon: Palette },
      { href: '/dashboard/marketing',  label: 'التسويق',        desc: 'كوبونات الخصم والمسوقون بالعمولة',   icon: Megaphone, feature: 'affiliates' },
      { href: '/dashboard/promotions', label: 'عروض تلقائية',   desc: 'اشترِ واحصل على آخر، أو خصم متدرج',   icon: Percent },
      { href: '/dashboard/gift-cards', label: 'بطاقات الهدايا', desc: 'أصدر بطاقات هدايا برصيد للزبائن',     icon: CreditCard },
    ],
  },
  {
    title: 'الحساب', code: 'ACC',
    links: [
      { href: '/dashboard/settings',  label: 'إعدادات المتجر',  desc: 'اسم المتجر، العملة، الشعار، والرابط',   icon: Settings },
      { href: '/dashboard/referrals', label: 'ادعُ واربح',       desc: 'ادعُ تجاراً واربح أشهراً مجانية',        icon: Gift },
      { href: '/dashboard/upgrade',   label: 'الباقات والترقية', desc: 'قارن الباقات وارفع خطتك بضغطة واحدة', icon: Crown },
    ],
  },
];

const allLinks = sections.flatMap((s) => s.links);

/** Primary destinations shown in the mobile bottom bar. */
const tabLinks = ['/dashboard', '/dashboard/orders', '/dashboard/products', '/dashboard/builder'];

function isActive(pathname: string, link: NavLink) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

const pad = (n: number) => String(n).padStart(2, '0');

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="flex items-stretch border-2 border-b-ink bg-white shadow-brut-sm">
      <span className="bg-b-yellow border-l-2 border-b-ink px-2 flex items-center font-mono text-xs font-bold">B/</span>
      <span className="px-2.5 py-1 text-xl font-bold leading-none flex items-center">بازار</span>
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const plan = (user?.plan ?? 'FREE') as Plan;
  const [query, setQuery] = useState('');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const q = query.trim();
  const visibleSections: NavSection[] = q
    ? [{ title: 'نتائج البحث', code: 'QRY', links: allLinks.filter((l) => l.label.includes(q) || l.desc.includes(q)) }]
    : sections;

  let counter = 0;

  return (
    <div className="flex flex-col h-full">
      {/* Masthead */}
      <div className="p-4 border-b-2 border-b-ink">
        <div className="flex items-center justify-between gap-2">
          <Logo onClick={onClose} />
          <div className="flex items-center gap-1">
            <NotificationBell variant="light" />
            {onClose && (
              <button onClick={onClose} aria-label="إغلاق"
                className="h-9 w-9 border-2 border-b-ink bg-white flex items-center justify-center hover:bg-b-yellow">
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
        <p className="b-label mt-3 text-gray-500">لوحة التاجر — MERCHANT CONSOLE</p>
      </div>

      {/* Search */}
      <label className="flex items-center gap-2 px-4 h-11 border-b-2 border-b-ink bg-white">
        <Search className="h-4 w-4 flex-shrink-0" strokeWidth={3} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث في القائمة_"
          className="flex-1 bg-transparent text-sm outline-none !border-0 !shadow-none !p-0 !bg-transparent"
        />
      </label>

      {/* Account strip */}
      {!q && (
        <Link href="/dashboard/upgrade" onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 border-b-2 border-b-ink bg-b-ink text-white hover:bg-b-blue">
          <span className="h-9 w-9 bg-b-yellow text-b-ink border-2 border-white flex items-center justify-center font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'م'}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold truncate">{user?.name}</span>
            <span className="block font-mono text-[11px] uppercase text-b-yellow truncate">
              PLAN:{plan} · {PLAN_LABELS[plan]}
            </span>
          </span>
          <ArrowLeft className="h-4 w-4 flex-shrink-0" strokeWidth={3} />
        </Link>
      )}

      {/* Index-style navigation */}
      <nav className="flex-1 overflow-y-auto">
        {visibleSections.map((section) => (
          <div key={section.code}>
            <div className="flex items-center justify-between px-4 py-1.5 border-b-2 border-b-ink bg-b-paper2">
              <span className="b-label">{section.title}</span>
              <span className="b-label text-gray-500">[{section.code}]</span>
            </div>
            {section.links.map((link) => {
              counter += 1;
              const active = isActive(pathname, link);
              const locked = link.feature ? !canUseFeature(plan, link.feature) : false;
              return (
                <Link
                  key={link.href}
                  href={locked ? '/dashboard/upgrade' : link.href}
                  onClick={onClose}
                  title={locked ? `${link.desc} — متاح في الخطة الاحترافية` : link.desc}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-2.5 border-b-2 border-b-ink text-[15px] font-medium',
                    active ? 'bg-b-yellow' : 'hover:bg-white',
                    locked && 'text-gray-400 bg-[repeating-linear-gradient(-45deg,transparent_0_6px,rgba(10,10,10,.06)_6px_8px)]',
                  )}
                >
                  <span className={cn('font-mono text-[11px] font-bold w-6', active ? 'text-b-ink' : 'text-gray-400')}>{pad(counter)}</span>
                  <link.icon className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
                  <span className="flex-1 truncate">{link.label}</span>
                  {locked
                    ? <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    : <ArrowLeft className={cn('h-4 w-4 flex-shrink-0 transition-transform', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:-translate-x-1')} strokeWidth={3} />}
                </Link>
              );
            })}
            {section.links.length === 0 && <p className="px-4 py-3 font-mono text-xs text-gray-500">NO RESULTS / لا توجد نتائج</p>}
          </div>
        ))}
      </nav>

      <button onClick={handleLogout}
        className="flex items-center justify-between px-4 h-12 border-t-2 border-b-ink bg-white font-bold text-b-red hover:bg-b-red hover:text-white">
        <span className="flex items-center gap-2"><LogOut className="h-4 w-4" strokeWidth={2.5} /> تسجيل الخروج</span>
        <span className="font-mono text-[11px]">ESC</span>
      </button>
    </div>
  );
}

export function DashboardSidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const current = allLinks.find((l) => isActive(pathname, l));
  const tabs = tabLinks.map((href) => allLinks.find((l) => l.href === href)!);

  return (
    <>
      {/* Mobile: top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between gap-2 px-3 bg-b-paper border-b-2 border-b-ink">
        <button onClick={() => setMenuOpen(true)} aria-label="القائمة"
          className="h-10 w-10 border-2 border-b-ink bg-b-yellow shadow-brut-sm flex items-center justify-center">
          <Menu className="h-5 w-5" strokeWidth={3} />
        </button>
        <span className="flex-1 truncate font-bold text-base">{current?.label ?? 'بازار'}</span>
        <NotificationBell variant="light" />
      </header>

      {/* Mobile: bottom bar */}
      <nav className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 bg-white border-t-2 border-b-ink">
        {tabs.map((t, i) => {
          const active = isActive(pathname, t);
          return (
            <Link key={t.href} href={t.href}
              className={cn('flex flex-col items-center gap-1 py-2 text-[11px] font-bold', i > 0 && 'border-r-2 border-b-ink', active ? 'bg-b-ink text-b-yellow' : 'text-b-ink')}>
              <t.icon className="h-5 w-5" strokeWidth={2.5} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: full-screen menu */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-b-ink/60" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-[88vw] max-w-sm h-full bg-b-paper border-l-2 border-b-ink shadow-brut-lg">
            <SidebarContent onClose={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[290px] h-screen sticky top-0 flex-col flex-shrink-0 bg-b-paper border-l-2 border-b-ink">
        <SidebarContent />
      </aside>
    </>
  );
}
