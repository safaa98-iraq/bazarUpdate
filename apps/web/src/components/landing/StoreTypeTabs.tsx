'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { STORE_TYPE_SHOWCASE } from '@/lib/landing-content';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { cn } from '@/lib/utils';

/** Store-type buttons; each one swaps the preview image, title, description and bullets. */
export function StoreTypeTabs() {
  const [activeId, setActiveId] = useState(STORE_TYPE_SHOWCASE[0]?.id);
  const active = STORE_TYPE_SHOWCASE.find(t => t.id === activeId) ?? STORE_TYPE_SHOWCASE[0];
  if (!active) return null;

  return (
    <section id="templates" className="px-4 sm:px-7 pt-20">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center">
          <h2 className="text-[clamp(26px,3.6vw,40px)] font-bold text-bz-ink leading-snug">متجر جاهز لكل نوع تجارة</h2>
          <p className="mt-3 text-bz-muted text-base sm:text-lg">اختر مجالك، وشوف شكل متجرك قبل ما تبدأ.</p>
        </div>

        {/* Tab buttons */}
        <div role="tablist" aria-label="أنواع المتاجر"
          className="mt-8 flex gap-2.5 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible [scrollbar-width:none]">
          {STORE_TYPE_SHOWCASE.map(t => {
            const on = t.id === active.id;
            return (
              <button key={t.id} role="tab" aria-selected={on} onClick={() => setActiveId(t.id)}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-2 h-12 ps-2 pe-4 rounded-full border text-[15px] font-semibold transition-all',
                  on ? 'bg-bz-ink border-bz-ink text-white shadow-[0_8px_20px_rgba(11,53,80,0.18)]'
                     : 'bg-white border-bz-line text-bz-ink-2 hover:border-bz-brand-300 hover:text-bz-ink',
                )}>
                <span className={cn('h-9 w-9 rounded-full flex items-center justify-center', on ? 'bg-white/10' : 'bg-bz-brand-50')}>
                  <ClayIcon name={t.icon} size={26} />
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div key={active.id} role="tabpanel"
          className="mt-8 rounded-[28px] bg-gradient-to-br from-[#EEF9FF] to-[#F7FBFE] border border-[#D6EEFC] p-5 sm:p-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center animate-[bz-sheet-in_.35s_cubic-bezier(.22,.8,.3,1)]">
          <div>
            <span className="inline-flex items-center gap-2 h-9 ps-1.5 pe-4 rounded-full bg-[#D6EEFC] text-bz-ink text-sm font-bold">
              <span className="h-7 w-7 rounded-full bg-white flex items-center justify-center"><ClayIcon name={active.icon} size={20} /></span>
              {active.label}
            </span>
            <h3 className="mt-4 text-[clamp(24px,3vw,34px)] font-bold text-bz-ink leading-snug">{active.title}</h3>
            <p className="mt-3 text-bz-muted text-base leading-8">{active.description}</p>
            <ul className="mt-5 space-y-3">
              {active.bullets.map(b => (
                <li key={b} className="flex items-center gap-2.5 text-bz-ink font-medium">
                  <CheckCircle2 className="h-5 w-5 text-bz-brand flex-shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/register?template=${active.id}`} className="bz-btn bz-btn-ink h-12 px-6 rounded-xl">
                أنشئ متجر {active.label} مجاناً
              </Link>
              <Link href={`/templates/${active.id}`} className="bz-btn bz-btn-outline h-12 px-6 rounded-xl">
                معاينة القالب <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl bg-white border border-bz-line shadow-[0_24px_60px_rgba(11,53,80,0.14)] overflow-hidden">
              <div className="h-8 flex items-center gap-1.5 px-3 border-b border-bz-line bg-bz-bg" dir="ltr">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F47272]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#22B07D]" />
                <span className="mx-auto text-[11px] text-bz-muted">bazar.iq/store/{active.id}</span>
              </div>
              <img src={active.image} alt={`قالب ${active.label}`} className="w-full aspect-[16/10] object-cover object-top" />
            </div>
            <ClayIcon name={active.icon} size={84} className="absolute -bottom-6 -left-4 drop-shadow-xl hidden sm:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
