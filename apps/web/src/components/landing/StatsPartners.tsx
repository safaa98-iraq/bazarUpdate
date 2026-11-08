/* eslint-disable @next/next/no-img-element */
import { BRAND_LOGOS, PLATFORM_STATS } from '@/lib/landing-content';
import { ClayIcon } from '@/components/ui/ClayIcon';

function LogoRow({ reverse = false }: { reverse?: boolean }) {
  // Duplicated list so the CSS marquee can loop seamlessly.
  const items = [...BRAND_LOGOS, ...BRAND_LOGOS];
  return (
    <div className="relative overflow-hidden py-3 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max gap-6 bz-logo-marquee" style={{ animationDirection: reverse ? 'reverse' : 'normal' }}>
        {items.map((b, i) => (
          <div key={`${b.name}-${i}`} title={b.name}
            className="h-20 w-48 flex-shrink-0 rounded-2xl bg-white border border-bz-line flex items-center justify-center px-4 grayscale-[35%] hover:grayscale-0 transition">
            <img src={b.logo} alt={b.name} className="max-h-12 w-full object-contain" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Platform in numbers" + scrolling "Success partners" logo strip. */
export function StatsPartners() {
  return (
    <section className="px-4 sm:px-7 pt-20">
      <div className="max-w-[1200px] mx-auto text-center">
        <h2 className="text-[clamp(26px,3.6vw,40px)] font-bold text-bz-ink leading-snug">
          منصّة عراقية للتجارة الإلكترونية تكبر مع متجرك
        </h2>
        <p className="mt-3 text-bz-muted text-base sm:text-lg max-w-2xl mx-auto leading-8">
          تجّار من كل المحافظات يبيعون عبر بازار يومياً، على بنية مصمّمة لتتحمّل مواسم الذروة والعروض.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-x-14 gap-y-8">
          {PLATFORM_STATS.map(s => (
            <div key={s.label} className="flex items-center gap-4">
              <span className="h-[72px] w-[72px] rounded-3xl border-[3px] border-[#BDE6FC] bg-bz-brand-50 flex items-center justify-center">
                <ClayIcon name={s.icon} size={46} />
              </span>
              <span className="text-right">
                <span className="block text-[clamp(28px,3.4vw,40px)] font-bold text-bz-ink leading-none tabular-nums" dir="ltr">{s.value}</span>
                <span className="block mt-2 text-sm text-bz-muted">{s.label}</span>
              </span>
            </div>
          ))}
        </div>

        <h3 className="mt-20 text-2xl sm:text-3xl font-bold text-bz-ink">شركاء النجاح</h3>
        <div className="mt-6 space-y-2">
          <LogoRow />
          <LogoRow reverse />
        </div>
      </div>
    </section>
  );
}
