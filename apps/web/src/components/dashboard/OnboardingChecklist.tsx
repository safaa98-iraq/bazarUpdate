'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket, Store, Image as ImageIcon, Package, Tag, Lightbulb, type LucideIcon } from 'lucide-react';

const B = { p: '#2F2E4B', a: '#DB6E93', border: '#FBE1EA', bg: '#FBF9F2', soft: '#F5EFFA' };

interface OnboardingStatus {
  store: boolean;
  logo: boolean;
  product: boolean;
  category: boolean;
  published: boolean;
}

const STEPS: {
  key: keyof OnboardingStatus;
  Icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  cta: string;
  tip: string;
}[] = [
  {
    key: 'store',
    Icon: Store,
    title: 'سمّي متجرك',
    desc: 'اختر اسماً مميزاً يعبّر عن متجرك',
    href: '/dashboard/settings',
    cta: 'إعداد المتجر',
    tip: 'الاسم الجيد قصير وسهل التذكر',
  },
  {
    key: 'logo',
    Icon: ImageIcon,
    title: 'أضف شعاراً',
    desc: 'الشعار يجعل متجرك يبدو احترافياً',
    href: '/dashboard/settings',
    cta: 'رفع الشعار',
    tip: 'صورة مربعة بدقة 512×512 أو أكثر',
  },
  {
    key: 'product',
    Icon: Package,
    title: 'أضف أول منتج',
    desc: 'أضف منتجاً واحداً على الأقل لبدء البيع',
    href: '/dashboard/products',
    cta: 'إضافة منتج',
    tip: 'أضف صورة واضحة وسعراً دقيقاً',
  },
  {
    key: 'category',
    Icon: Tag,
    title: 'أنشئ تصنيفاً',
    desc: 'التصنيفات تساعد الزبائن على التصفح',
    href: '/dashboard/categories',
    cta: 'إضافة تصنيف',
    tip: 'مثال: فساتين، بلوزات، إكسسوارات',
  },
  {
    key: 'published',
    Icon: Rocket,
    title: 'انشر متجرك',
    desc: 'اجعل متجرك مرئياً للزبائن',
    href: '/dashboard/settings',
    cta: 'نشر المتجر',
    tip: 'يمكنك إخفاؤه في أي وقت من الإعدادات',
  },
];

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: OnboardingStatus }>('/api/stores/my/onboarding')
      .then(r => setStatus(r.data))
      .catch(() => null);
  }, []);

  if (!status) return null;

  const completed = STEPS.filter(s => status[s.key]).length;
  const total = STEPS.length;
  const allDone = completed === total;

  if (allDone) return null; // hide once everything is done

  const pct = Math.round((completed / total) * 100);

  return (
    <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${B.border}`, background: '#fff' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        style={{ background: B.bg }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: B.a }}>
          <Rocket className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-sm" style={{ color: B.p }}>
              {completed === 0 ? 'ابدأ ببناء متجرك' : `أكملت ${completed} من ${total} خطوات`}
            </p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${B.a}15`, color: B.a }}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#ECE6F0' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${B.p}, ${B.a})` }} />
          </div>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: B.p }} />
                   : <ChevronUp   className="h-4 w-4 flex-shrink-0" style={{ color: B.p }} />}
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y" style={{ borderColor: B.border }}>
          {STEPS.map((step, i) => {
            const done = status[step.key];
            const isNext = !done && STEPS.slice(0, i).every(s => status[s.key]);
            return (
              <div key={step.key}
                className="flex items-start gap-3 px-5 py-3.5 transition"
                style={{ background: isNext ? B.soft : '#fff' }}>
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {done
                    ? <CheckCircle2 className="h-5 w-5" style={{ color: '#10b981' }} />
                    : <Circle className="h-5 w-5" style={{ color: isNext ? B.a : '#D1D5DB' }} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <step.Icon className="h-4 w-4" style={{ color: isNext ? B.a : B.p }} />
                    <p className={`text-sm font-semibold ${done ? 'line-through text-gray-400' : ''}`}
                      style={done ? undefined : { color: B.p }}>
                      {step.title}
                    </p>
                    {isNext && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: B.a }}>التالي</span>
                    )}
                  </div>
                  {!done && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                  )}
                  {isNext && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#6B7280' }}>
                      <Lightbulb className="h-3 w-3" /> {step.tip}
                    </p>
                  )}
                </div>

                {/* CTA */}
                {!done && (
                  <Link href={step.href}
                    className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition hover:opacity-80"
                    style={isNext
                      ? { background: `linear-gradient(135deg, ${B.p}, ${B.a})`, color: '#fff' }
                      : { background: B.soft, color: B.p, border: `1px solid ${B.border}` }}>
                    {step.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
