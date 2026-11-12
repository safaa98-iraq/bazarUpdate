'use client';
/* eslint-disable @next/next/no-img-element */
import { Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { BRAND_LOGOS, HERO_LOGO_COUNT, HERO_BADGE_TEXT, PLATFORM_STATS } from '@/lib/landing-content';

/**
 * Hero trust badge: a row of round merchant logos with a wide "active stores"
 * pill underneath. The pill is exactly as wide as the logo row and tucks
 * slightly under the logos so the two read as one unit.
 */
export function HeroLogos() {
  const t = useT();
  const logos = BRAND_LOGOS.slice(0, HERO_LOGO_COUNT);
  return (
    <div className="inline-grid justify-items-stretch mb-7 max-w-full">
      {/* Logos */}
      <div className="relative z-10 flex justify-center px-3">
        {logos.map((b, i) => (
          <span
            key={b.name}
            title={b.name}
            className={`${i >= 6 ? 'hidden sm:flex' : 'flex'} h-11 w-11 sm:h-[60px] sm:w-[60px] -ms-1.5 first:ms-0 rounded-full border-2 border-[#E3F5FE] shadow-[0_2px_8px_rgba(11,53,80,0.10)] items-center justify-center overflow-hidden transition-transform hover:-translate-y-1`}
            style={{ zIndex: logos.length - i, background: b.bg }}
          >
            <img src={b.mark} alt={b.name} className="h-full w-full object-cover scale-[1.18]" />
          </span>
        ))}
      </div>

      {/* Active-stores pill: same width as the logo row, overlapping its bottom edge */}
      <div className="-mt-3 sm:-mt-4 flex items-center justify-center gap-2.5 sm:gap-3 h-11 sm:h-14 px-4 sm:px-6 rounded-full bg-[#C9EBFD] border-2 border-white shadow-[0_8px_24px_rgba(32,169,244,0.22)]">
        <span className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-bz-ink text-white flex items-center justify-center flex-shrink-0">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={3} />
        </span>
        <span className="text-[13px] sm:text-lg font-bold text-bz-ink whitespace-nowrap">
          <bdi className="tabular-nums">{PLATFORM_STATS[0]?.value}</bdi> {t(HERO_BADGE_TEXT)}
        </span>
      </div>
    </div>
  );
}
