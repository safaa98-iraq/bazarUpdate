'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Settings, Palette, LogOut, Store,
  MessageCircle, Lock, Zap, Crown, Menu, X, Megaphone, Tag, BadgeCheck, Gift,
  CreditCard, Percent, FilePlus2, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, Plan, PLAN_COLORS, PLAN_LABELS } from '@/lib/plan-features';
import { NotificationBell } from './NotificationBell';

type NavLink = {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  exact?: boolean;
  feature?: string;
};

const links: NavLink[] = [
  { href: '/dashboard',             label: 'الرئيسية',        desc: 'نظرة عامة على مبيعاتك وطلباتك',          icon: LayoutDashboard, exact: true },
  { href: '/dashboard/products',    label: 'منتجاتي',         desc: 'أضف منتجاتك وعدّل أسعارها وصورها',       icon: Package },
  { href: '/dashboard/categories',  label: 'التصنيفات',       desc: 'أنشئ تصنيفات تظهر في رأس متجرك',          icon: Tag },
  { href: '/dashboard/brands',      label: 'الماركات',        desc: 'أضف ماركات تجارية وصنّف منتجاتك تحتها',       icon: BadgeCheck, feature: 'brands' },
  { href: '/dashboard/orders',      label: 'الطلبات',         desc: 'تابع طلبات عملائك وحدّث حالتها',         icon: ShoppingCart },
  { href: '/dashboard/draft-orders', label: 'طلبات يدوية',    desc: 'سجّل طلباً وصلك عبر واتساب أو انستغرام',       icon: FilePlus2 },
  { href: '/dashboard/abandoned-carts', label: 'السلال المتروكة', desc: 'زبائن تركوا سلتهم قبل إتمام الطلب',        icon: Clock },
  { href: '/dashboard/chat',        label: 'رسائل العملاء',   desc: 'تحدث مع عملائك مباشرة من متجرك',              icon: MessageCircle, feature: 'chat' },
  { href: '/dashboard/builder',     label: 'شكل المتجر',      desc: 'صمّم متجرك وأضف البانرات الترويجية',          icon: Palette },
  { href: '/dashboard/marketing',   label: 'التسويق',         desc: 'كوبونات الخصم والمسوقون بالعمولة',            icon: Megaphone, feature: 'affiliates' },
  { href: '/dashboard/promotions',  label: 'عروض تلقائية',    desc: 'اشترِ واحصل على آخر، أو خصم متدرج',            icon: Percent },
  { href: '/dashboard/gift-cards',  label: 'بطاقات الهدايا',  desc: 'أصدر بطاقات هدايا برصيد للزبائن',              icon: CreditCard },
  { href: '/dashboard/settings',    label: 'إعدادات المتجر',  desc: 'اسم المتجر، العملة، الشعار، والرابط',         icon: Settings },
  { href: '/dashboard/referrals',   label: 'ادعُ واربح',       desc: 'ادعُ تجاراً واربح أشهراً مجانية',              icon: Gift },
  { href: '/dashboard/upgrade',     label: 'الباقات والترقية', desc: 'قارن الباقات وارفع خطتك بضغطة واحدة',        icon: Crown },
];

function Tooltip({ text }: { text: string }) {
  return (
    <span className="
      absolute right-full mr-2 top-1/2 -translate-y-1/2
      bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5
      whitespace-nowrap opacity-0 group-hover:opacity-100
      pointer-events-none transition-opacity duration-150 z-50
      shadow-lg
    ">
      {text}
      <span className="absolute right-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-r-0 border-l-gray-900" />
    </span>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const plan = (user?.plan ?? 'FREE') as Plan;
  const planColors = PLAN_COLORS[plan];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DB6E93' }}>
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">بازار</p>
            <p className="text-white/40 text-xs">لوحة التاجر</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell variant="dark" />
          {onClose && (
            <button onClick={onClose} className="text-white/60 hover:text-white transition p-1">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Plan badge */}
      <div className="mx-3 mt-3">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-white/40 text-[10px] mb-0.5">باقتك الحالية</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: planColors.bg, color: planColors.text }}>
              {PLAN_LABELS[plan]}
            </span>
          </div>
          {plan === 'FREE' && (
            <Link
              href="/dashboard/upgrade"
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #DB6E93)', color: 'white' }}
            >
              <Zap className="h-3 w-3" />
              ارفع باقتك
            </Link>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {links.map(({ href, label, desc, icon: Icon, exact, feature }) => {
          const active    = exact ? pathname === href : pathname.startsWith(href);
          const locked    = feature ? !canUseFeature(plan, feature) : false;
          const isUpgrade = href === '/dashboard/upgrade';

          if (locked) {
            return (
              <Link
                key={href}
                href="/dashboard/upgrade"
                onClick={onClose}
                className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-white/30 hover:text-white/50"
              >
                <Tooltip text={`${desc} — متاح في الخطة الاحترافية`} />
                <Icon className="h-4 w-4 flex-shrink-0 opacity-40" />
                <span className="flex-1 truncate">{label}</span>
                <Lock className="h-3 w-3 opacity-40 flex-shrink-0" />
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active ? 'text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10',
                isUpgrade && !active ? 'border border-white/10' : '',
              )}
              style={
                active ? { background: '#4A4767' }
                : isUpgrade ? { background: 'rgba(174,68,90,0.15)' }
                : undefined
              }
            >
              <Tooltip text={desc} />
              <Icon className={cn('h-4 w-4 flex-shrink-0', isUpgrade && !active ? 'text-rose-300' : '')} />
              <span className={cn('flex-1 truncate', isUpgrade && !active ? 'text-rose-300' : '')}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: '#DB6E93' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? 'م'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition hover:bg-white/10"
          style={{ color: '#FBE1EA' }}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 right-0 left-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ background: '#2F2E4B' }}
      >
        <button onClick={() => setMobileOpen(true)} className="text-white p-1">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 flex-1">
          <Store className="h-5 w-5 text-white" />
          <span className="text-white font-bold text-base">بازار</span>
        </Link>
        <NotificationBell variant="dark" />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-72 max-w-[85vw] flex flex-col h-full mr-auto overflow-y-auto"
            style={{ background: '#2F2E4B' }}
          >
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen flex-col flex-shrink-0" style={{ background: '#2F2E4B' }}>
        <SidebarContent />
      </aside>
    </>
  );
}
