/* eslint-disable @next/next/no-img-element */
import { Check } from 'lucide-react';
import { BRAND_LOGOS, HERO_LOGO_COUNT, HERO_BADGE_TEXT, PLATFORM_STATS } from '@/lib/landing-content';

/** Overlapping round merchant logos with an "active stores" pill underneath (hero). */
export function HeroLogos() {
  const logos = BRAND_LOGOS.slice(0, HERO_LOGO_COUNT);
  return (
    <div className="inline-flex flex-col items-start gap-0 mb-6">
      <div className="flex items-center ps-3 relative z-10">
        {logos.map((b, i) => (
          <span key={b.name} title={b.name}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white border-[3px] border-[#E3F5FE] shadow-[0_4px_10px_rgba(11,53,80,0.10)] flex items-center justify-center overflow-hidden -ms-3 first:ms-0 transition-transform hover:-translate-y-1"
            style={{ zIndex: logos.length - i }}>
            <img src={b.mark} alt={b.name} className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
          </span>
        ))}
      </div>
      <span className="-mt-2 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-[#BDE6FC] px-4 py-2 shadow-[0_6px_18px_rgba(32,169,244,0.18)]">
        <span className="h-6 w-6 rounded-full bg-bz-ink text-white flex items-center justify-center flex-shrink-0">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        <span className="text-sm sm:text-[15px] font-bold text-bz-ink">
          <span className="tabular-nums" dir="ltr">{PLATFORM_STATS[0]?.value}</span> {HERO_BADGE_TEXT}
        </span>
      </span>
    </div>
  );
}
