'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Lock, X, Menu, Search, Plus, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, Plan, PLAN_LABELS } from '@/lib/plan-features';
import type { StaffPermission, StaffSession } from '@storebuilder/types';
import { ClayIcon, type ClayIconName } from '@/components/ui/ClayIcon';
import { NotificationBell } from './NotificationBell';

type NavLink = {
  href: string;
  label: string;
  desc: string;
  icon: ClayIconName;
  exact?: boolean;
  feature?: string;
  /** Staff permission needed to see this item; 'owner' = store owner only. */
  perm?: StaffPermission | 'owner';
};

type NavSection = { title?: string; links: NavLink[] };

const sections: NavSection[] = [
  {
    links: [
      { href: '/dashboard', label: 'الرئيسية', desc: 'نظرة عامة على مبيعاتك وطلباتك', icon: 'apps', exact: true },
    ],
  },
  {
    title: 'المتجر',
    links: [
      { href: '/dashboard/products',   label: 'المنتجات',  desc: 'أضف منتجاتك وعدّل أسعارها وصورها',       icon: 'box', perm: 'products' },
      { href: '/dashboard/categories', label: 'التصنيفات', desc: 'أنشئ تصنيفات تظهر في رأس متجرك',         icon: 'tag', perm: 'products' },
      { href: '/dashboard/brands',     label: 'الماركات',  desc: 'أضف ماركات تجارية وصنّف منتجاتك تحتها', icon: 'badge-check', feature: 'brands', perm: 'products' },
      { href: '/dashboard/builder',    label: 'تصميم المتجر', desc: 'صمّم متجرك وأضف البانرات الترويجية', icon: 'storefront', perm: 'design' },
    ],
  },
  {
    title: 'المبيعات',
    links: [
      { href: '/dashboard/orders',          label: 'الطلبات',         desc: 'تابع طلبات عملائك وحدّث حالتها',          icon: 'cart', perm: 'orders' },
      { href: '/dashboard/draft-orders',    label: 'طلبات يدوية',     desc: 'سجّل طلباً وصلك عبر واتساب أو انستغرام', icon: 'documents', perm: 'orders' },
      { href: '/dashboard/abandoned-carts', label: 'السلال المتروكة', desc: 'زبائن تركوا سلتهم قبل إتمام الطلب',       icon: 'basket', perm: 'orders' },
      { href: '/dashboard/shipping',        label: 'الشحن والبوالص',  desc: 'اطبع البوالص واربط شركة التوصيل وتتبع الشحنات', icon: 'truck', perm: 'orders' },
      { href: '/dashboard/whatsapp',        label: 'تأكيد واتساب',    desc: 'الزبون يؤكد طلبه قبل الشحن بضغطة', icon: 'send', perm: 'settings', feature: 'whatsapp_confirm' },
      { href: '/dashboard/chat',            label: 'رسائل العملاء',   desc: 'تحدث مع عملائك مباشرة من متجرك',          icon: 'chat', feature: 'chat', perm: 'chat' },
    ],
  },
  {
    title: 'التسويق',
    links: [
      { href: '/dashboard/marketing',  label: 'أدوات التسويق',  desc: 'كوبونات الخصم والمسوقون بالعمولة', icon: 'megaphone', feature: 'affiliates', perm: 'marketing' },
      { href: '/dashboard/promotions', label: 'العروض التلقائية', desc: 'اشترِ واحصل على آخر، أو خصم متدرج', icon: 'discount', perm: 'marketing' },
      { href: '/dashboard/gift-cards', label: 'بطاقات الهدايا', desc: 'أصدر بطاقات هدايا برصيد للزبائن',   icon: 'gift', perm: 'marketing' },
      { href: '/dashboard/referrals',  label: 'ادعُ واربح',      desc: 'ادعُ تجاراً واربح أشهراً مجانية',    icon: 'users', perm: 'owner' },
    ],
  },
  {
    title: 'الحساب',
    links: [
      { href: '/dashboard/branches', label: 'الفروع والمخازن', desc: 'وزّع المخزون على الفروع وحوّل الطلبات للأقرب', icon: 'location', perm: 'branches', feature: 'branches' },
      { href: '/dashboard/staff',    label: 'الموظفون',        desc: 'حسابات للموظفين بصلاحيات محددة', icon: 'shield-lock', perm: 'owner', feature: 'staff' },
      { href: '/dashboard/store-app', label: 'تطبيق المتجر',   desc: 'تطبيق جوال باسم متجرك وشعاره', icon: 'apps', perm: 'settings', feature: 'store_app' },
      { href: '/dashboard/languages', label: 'لغات المتجر',    desc: 'واجهة المتجر بالعربية والكردية', icon: 'chat', perm: 'settings', feature: 'languages' },
      { href: '/dashboard/settings', label: 'الإعدادات',        desc: 'اسم المتجر، العملة، الشعار، والرابط',   icon: 'settings', perm: 'settings' },
      { href: '/dashboard/upgrade',  label: 'الباقات والترقية', desc: 'قارن الباقات وارفع خطتك بضغطة واحدة', icon: 'star', perm: 'owner' },
    ],
  },
];

const allLinks = sections.flatMap((s) => s.links);

/** Staff only see the pages their permissions cover (owner-only pages are hidden). */
export function canStaffSee(staff: StaffSession | null, perm?: NavLink['perm']): boolean {
  if (!staff || !perm) return true;
  if (perm === 'owner') return false;
  return staff.permissions.includes(perm);
}

function filterSectionsForStaff(staff: StaffSession | null): NavSection[] {
  if (!staff) return sections;
  return sections
    .map(s => ({ ...s, links: s.links.filter(l => canStaffSee(staff, l.perm)) }))
    .filter(s => s.links.length > 0);
}

/** Primary destinations shown in the mobile bottom bar. */
const tabLinks = ['/dashboard', '/dashboard/orders', '/dashboard/products', '/dashboard/builder'];

function isActive(pathname: string, link: NavLink) {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onClick} className="flex items-center gap-2.5">
      <span className="h-10 w-10 rounded-xl bg-bz-brand-100 flex items-center justify-center">
        <ClayIcon name="store" size={30} />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-bold text-bz-ink">بازار</span>
        <span className="block text-[11px] text-bz-muted">لوحة التاجر</span>
      </span>
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const plan = (user?.plan ?? 'FREE') as Plan;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  const staff = (user as { staff?: StaffSession | null } | null)?.staff ?? null;
  const visibleSections = filterSectionsForStaff(staff);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 h-16 border-b border-bz-line flex-shrink-0">
        <Brand onClick={onClose} />
        {onClose && (
          <button onClick={onClose} aria-label="إغلاق"
            className="h-9 w-9 rounded-full bg-bz-bg text-bz-muted flex items-center justify-center hover:text-bz-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section, i) => (
          <div key={section.title ?? i} className={i > 0 ? 'mt-5' : ''}>
            {section.title && <p className="px-3 mb-1.5 text-[11px] font-semibold text-bz-muted">{section.title}</p>}
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
                      'relative flex items-center gap-3 rounded-xl px-3 h-11 text-[14px] transition-colors',
                      active
                        ? 'bg-bz-brand-50 text-bz-brand-600 font-bold before:absolute before:right-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-bz-brand'
                        : 'text-bz-ink-2 font-medium hover:bg-bz-bg hover:text-bz-ink',
                      locked && 'opacity-55',
                    )}
                  >
                    <ClayIcon name={link.icon} size={26} className={locked ? 'grayscale' : ''} />
                    <span className="flex-1 truncate">{link.label}</span>
                    {locked && <Lock className="h-3.5 w-3.5 text-bz-muted" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-bz-line space-y-2 flex-shrink-0">
        {plan === 'FREE' && !staff && (
          <Link href="/dashboard/upgrade" onClick={onClose}
            className="relative overflow-hidden flex items-center gap-3 rounded-2xl p-3 bg-bz-ink text-white">
            <span className="bz-blob w-24 h-24 bg-bz-brand -top-8 -left-8" />
            <ClayIcon name="star" size={34} className="relative" />
            <span className="relative flex-1 min-w-0">
              <span className="block text-[13px] font-bold">ارفع باقتك</span>
              <span className="block text-[11px] text-white/70 truncate">منتجات غير محدودة وتحليلات متقدمة</span>
            </span>
            <ChevronLeft className="relative h-4 w-4 text-bz-brand-300" />
          </Link>
        )}
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <span className="h-9 w-9 rounded-full bg-bz-brand-100 text-bz-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'م'}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-bold text-bz-ink truncate">{user?.name}</span>
            <span className="block text-[11px] text-bz-muted truncate">{staff ? 'حساب موظف' : `باقة ${PLAN_LABELS[plan]}`}</span>
          </span>
          <button onClick={handleLogout} title="تسجيل الخروج" aria-label="تسجيل الخروج"
            className="h-9 w-9 rounded-full flex items-center justify-center text-bz-muted hover:bg-[#FDECEC] hover:text-bz-red">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Desktop top bar: page title, search, store link and notifications. */
export function DashboardTopbar() {
  const pathname = usePathname();
  const current = allLinks.find((l) => isActive(pathname, l));
  return (
    <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center gap-4 px-8 bz-bar border-b border-bz-line print:hidden">
      <div className="flex items-center gap-2 text-[13px] text-bz-muted">
        <Link href="/dashboard" className="hover:text-bz-ink">بازار</Link>
        {current && current.href !== '/dashboard' && (<><ChevronLeft className="h-3.5 w-3.5" /><span className="font-semibold text-bz-ink">{current.label}</span></>)}
      </div>
      <label className="bz-search flex-1 max-w-md mr-auto">
        <Search className="h-4 w-4 flex-shrink-0" />
        <input placeholder="ابحث عن طلب أو منتج أو عميل…" className="flex-1 bg-transparent text-sm text-bz-ink placeholder:text-bz-muted outline-none !border-0 !shadow-none !p-0" />
      </label>
      <Link href="/dashboard/products" className="bz-btn h-10 px-5 text-[13px]">
        <Plus className="h-4 w-4" strokeWidth={2.5} /> إضافة منتج
      </Link>
      <span className="h-10 w-10 rounded-full border border-bz-line bg-white flex items-center justify-center">
        <NotificationBell variant="light" />
      </span>
    </header>
  );
}

export function DashboardSidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const staff = (useAuthStore((st) => st.user) as { staff?: StaffSession | null } | null)?.staff ?? null;
  const tabs = tabLinks.map((href) => allLinks.find((l) => l.href === href)!).filter((l) => canStaffSee(staff, l.perm));

  return (
    <>
      {/* Mobile: top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 bz-bar border-b border-bz-line">
        <button onClick={() => setMenuOpen(true)} aria-label="القائمة"
          className="h-10 w-10 rounded-xl border border-bz-line bg-white flex items-center justify-center text-bz-ink">
          <Menu className="h-5 w-5" />
        </button>
        <Brand />
        <span className="h-10 w-10 rounded-xl border border-bz-line bg-white flex items-center justify-center">
          <NotificationBell variant="light" />
        </span>
      </header>

      {/* Mobile: bottom bar */}
      <nav className="lg:hidden print:hidden fixed bottom-0 inset-x-0 z-40 bz-bar border-t border-bz-line flex justify-around px-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}>
        {tabs.map((t) => {
          const active = isActive(pathname, t);
          return (
            <Link key={t.href} href={t.href}
              className={cn('flex-1 flex flex-col items-center gap-1 pt-2 text-[11px]', active ? 'text-bz-brand-600 font-bold' : 'text-bz-muted font-medium')}>
              <span className={cn('h-9 w-12 rounded-full flex items-center justify-center transition-colors', active && 'bg-bz-brand-100')}>
                <ClayIcon name={t.icon} size={26} />
              </span>
              {t.label}
            </Link>
          );
        })}
        <button onClick={() => setMenuOpen(true)} className="flex-1 flex flex-col items-center gap-1 pt-2 text-[11px] font-medium text-bz-muted">
          <span className="h-9 w-12 rounded-full flex items-center justify-center"><ClayIcon name="settings" size={26} /></span>
          المزيد
        </button>
      </nav>

      {/* Mobile: drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-[rgba(11,53,80,0.35)] backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-[86vw] max-w-[300px] h-full bg-white shadow-[0_24px_64px_rgba(11,53,80,0.18)] animate-[bz-sheet-in_.3s_cubic-bezier(.22,.8,.3,1)]">
            <SidebarContent onClose={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[264px] h-screen sticky top-0 flex-col flex-shrink-0 bg-white border-l border-bz-line">
        <SidebarContent />
      </aside>
    </>
  );
}
