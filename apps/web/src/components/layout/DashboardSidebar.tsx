'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Settings, Palette, LogOut, Store,
  MessageCircle, Lock, Crown, X, Megaphone, Tag, BadgeCheck, Gift,
  CreditCard, Percent, FilePlus2, Clock, ChevronLeft, Search, MoreHorizontal,
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
  /** iOS system color for the Settings-style rounded icon tile */
  tint: string;
  exact?: boolean;
  feature?: string;
};

type NavSection = { title?: string; links: NavLink[] };

const sections: NavSection[] = [
  {
    links: [
      { href: '/dashboard', label: 'الرئيسية', desc: 'نظرة عامة على مبيعاتك وطلباتك', icon: LayoutDashboard, tint: '#007AFF', exact: true },
    ],
  },
  {
    title: 'الكتالوج',
    links: [
      { href: '/dashboard/products',   label: 'منتجاتي',   desc: 'أضف منتجاتك وعدّل أسعارها وصورها', icon: Package,    tint: '#FF9500' },
      { href: '/dashboard/categories', label: 'التصنيفات', desc: 'أنشئ تصنيفات تظهر في رأس متجرك',   icon: Tag,        tint: '#34C759' },
      { href: '/dashboard/brands',     label: 'الماركات',  desc: 'أضف ماركات تجارية وصنّف منتجاتك تحتها', icon: BadgeCheck, tint: '#5856D6', feature: 'brands' },
    ],
  },
  {
    title: 'المبيعات',
    links: [
      { href: '/dashboard/orders',          label: 'الطلبات',        desc: 'تابع طلبات عملائك وحدّث حالتها',        icon: ShoppingCart,  tint: '#FF3B30' },
      { href: '/dashboard/draft-orders',    label: 'طلبات يدوية',    desc: 'سجّل طلباً وصلك عبر واتساب أو انستغرام', icon: FilePlus2,     tint: '#8E8E93' },
      { href: '/dashboard/abandoned-carts', label: 'السلال المتروكة', desc: 'زبائن تركوا سلتهم قبل إتمام الطلب',      icon: Clock,         tint: '#FF9500' },
      { href: '/dashboard/chat',            label: 'رسائل العملاء',  desc: 'تحدث مع عملائك مباشرة من متجرك',         icon: MessageCircle, tint: '#34C759', feature: 'chat' },
    ],
  },
  {
    title: 'النمو',
    links: [
      { href: '/dashboard/builder',    label: 'شكل المتجر',     desc: 'صمّم متجرك وأضف البانرات الترويجية', icon: Palette,    tint: '#AF52DE' },
      { href: '/dashboard/marketing',  label: 'التسويق',        desc: 'كوبونات الخصم والمسوقون بالعمولة',   icon: Megaphone,  tint: '#FF2D55', feature: 'affiliates' },
      { href: '/dashboard/promotions', label: 'عروض تلقائية',   desc: 'اشترِ واحصل على آخر، أو خصم متدرج',   icon: Percent,    tint: '#30B0C7' },
      { href: '/dashboard/gift-cards', label: 'بطاقات الهدايا', desc: 'أصدر بطاقات هدايا برصيد للزبائن',     icon: CreditCard, tint: '#5856D6' },
    ],
  },
  {
    title: 'الحساب',
    links: [
      { href: '/dashboard/settings',  label: 'إعدادات المتجر',  desc: 'اسم المتجر، العملة، الشعار، والرابط',  icon: Settings, tint: '#8E8E93' },
      { href: '/dashboard/referrals', label: 'ادعُ واربح',       desc: 'ادعُ تجاراً واربح أشهراً مجانية',       icon: Gift,     tint: '#FF2D55' },
      { href: '/dashboard/upgrade',   label: 'الباقات والترقية', desc: 'قارن الباقات وارفع خطتك بضغطة واحدة', icon: Crown,    tint: '#FFCC00' },
    ],
  },
];

const allLinks = sections.flatMap((s) => s.links);

/** Primary destinations shown in the iPhone-style bottom tab bar. */
const tabLinks = ['/dashboard', '/dashboard/orders', '/dashboard/products', '/dashboard/builder'];

function isActive(pathname: string, link: NavLink) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

function IconTile({ icon: Icon, tint, dim }: { icon: React.ElementType; tint: string; dim?: boolean }) {
  return (
    <span className="ios-icon" style={{ background: tint, opacity: dim ? 0.45 : 1 }}>
      <Icon className="h-[17px] w-[17px]" strokeWidth={2.25} />
    </span>
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
  const visibleSections = q
    ? [{ title: 'النتائج', links: allLinks.filter((l) => l.label.includes(q) || l.desc.includes(q)) }]
    : sections;

  return (
    <div className="flex flex-col h-full">
      {/* Large-title header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="h-9 w-9 rounded-[10px] flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(160deg, #0A84FF, #5E5CE6)' }}>
              <Store className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
            </span>
            <span className="text-[26px] font-bold leading-none text-gray-900">بازار</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell variant="light" />
            {onClose && (
              <button onClick={onClose} aria-label="إغلاق"
                className="h-[30px] w-[30px] rounded-full bg-[rgba(120,120,128,0.12)] text-gray-500 flex items-center justify-center">
                <X className="h-4 w-4" strokeWidth={2.75} />
              </button>
            )}
          </div>
        </div>
        <label className="ios-search">
          <Search className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث"
            className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-500 outline-none !shadow-none !border-0 !p-0"
          />
        </label>
      </div>

      {/* Account card (Apple ID–style) */}
      {!q && (
        <div className="px-4 pb-2">
          <Link href="/dashboard/upgrade" onClick={onClose}
            className="bg-white rounded-[12px] flex items-center gap-3 px-3 py-2.5 active:bg-gray-100 transition-colors">
            <span className="h-11 w-11 rounded-full flex items-center justify-center text-white text-[17px] font-semibold flex-shrink-0"
              style={{ background: 'linear-gradient(160deg, #A2A2A7, #6E6E73)' }}>
              {user?.name?.charAt(0)?.toUpperCase() ?? 'م'}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-gray-900 truncate">{user?.name}</span>
              <span className="block text-[12px] text-gray-500 truncate">
                باقة {PLAN_LABELS[plan]}{plan === 'FREE' ? ' · ارفع باقتك' : ''}
              </span>
            </span>
            <ChevronLeft className="h-4 w-4 text-gray-300 flex-shrink-0" strokeWidth={2.75} />
          </Link>
        </div>
      )}

      {/* Grouped navigation */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto">
        {visibleSections.map((section, i) => (
          <div key={section.title ?? i} className="mt-4 first:mt-2">
            {section.title && <p className="px-3 pb-1.5 text-[13px] font-medium text-gray-500">{section.title}</p>}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active = isActive(pathname, link);
                const locked = link.feature ? !canUseFeature(plan, link.feature) : false;
                return (
                  <Link
                    key={link.href}
                    href={locked ? '/dashboard/upgrade' : link.href}
                    onClick={onClose}
                    title={locked ? `${link.desc} — متاح في الخطة الاحترافية` : link.desc}
                    className={cn(
                      'flex items-center gap-3 px-2 py-[7px] rounded-[10px] text-[15px] transition-colors duration-150',
                      active ? 'bg-ios-blue text-white' : 'text-gray-900 hover:bg-[rgba(120,120,128,0.10)]',
                      locked && 'text-gray-400',
                    )}
                  >
                    {active
                      ? <span className="ios-icon bg-white/20"><link.icon className="h-[17px] w-[17px]" strokeWidth={2.25} /></span>
                      : <IconTile icon={link.icon} tint={link.tint} dim={locked} />}
                    <span className="flex-1 truncate font-medium">{link.label}</span>
                    {locked && <Lock className="h-3.5 w-3.5 flex-shrink-0" />}
                  </Link>
                );
              })}
              {section.links.length === 0 && <p className="px-3 py-2 text-[13px] text-gray-500">لا توجد نتائج</p>}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <button onClick={handleLogout}
            className="bg-white rounded-[12px] w-full flex items-center justify-center gap-2 py-3 text-[15px] font-medium text-ios-red active:bg-gray-100">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </nav>
    </div>
  );
}

export function DashboardSidebar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const current = allLinks.find((l) => isActive(pathname, l));
  const tabs = tabLinks.map((href) => allLinks.find((l) => l.href === href)!);
  const moreActive = !!current && !tabLinks.includes(current.href);

  return (
    <>
      {/* iPhone: frosted navigation bar */}
      <header className="lg:hidden ios-bar fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 shadow-[0_0.5px_0_rgba(0,0,0,0.15)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-[8px] flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0A84FF, #5E5CE6)' }}>
            <Store className="h-4 w-4 text-white" strokeWidth={2.25} />
          </span>
          <span className="text-[17px] font-semibold text-gray-900">{current?.label ?? 'بازار'}</span>
        </Link>
        <NotificationBell variant="light" />
      </header>

      {/* iPhone: bottom tab bar */}
      <nav className="lg:hidden print:hidden ios-bar fixed bottom-0 inset-x-0 z-40 flex justify-around shadow-[0_-0.5px_0_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}>
        {tabs.map((t) => {
          const active = isActive(pathname, t);
          return (
            <Link key={t.href} href={t.href}
              className={cn('flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] font-medium', active ? 'text-ios-blue' : 'text-gray-500')}>
              <t.icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.9} />
              {t.label}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(true)}
          className={cn('flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1 text-[10px] font-medium', moreActive ? 'text-ios-blue' : 'text-gray-500')}>
          <MoreHorizontal className="h-6 w-6" strokeWidth={moreActive ? 2.4 : 1.9} />
          المزيد
        </button>
      </nav>

      {/* iPhone: "More" sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} />
          <aside className="relative h-[92vh] rounded-t-[22px] bg-ios-bg overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.2)] animate-[ios-sheet-in_.4s_cubic-bezier(.32,.72,0,1)]">
            <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-gray-300" />
            <SidebarContent onClose={() => setMoreOpen(false)} />
          </aside>
        </div>
      )}

      {/* iPad / desktop: sidebar */}
      <aside className="hidden lg:flex w-[300px] h-screen sticky top-0 flex-col flex-shrink-0 bg-ios-bg border-l border-[rgba(60,60,67,0.12)]">
        <SidebarContent />
      </aside>
    </>
  );
}
