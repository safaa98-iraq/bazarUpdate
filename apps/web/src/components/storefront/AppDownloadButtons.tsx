/* eslint-disable @next/next/no-img-element */
/** Google Play / App Store download buttons for a store's branded app (no client JS). */

function AndroidMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.5 11.5 0 0 0-9.84 0L5.22 5.92a.38.38 0 1 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.4-.92-2.42-3.65zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z" />
    </svg>
  );
}

export function AppDownloadButtons({ androidUrl, iosUrl, size = 'md' }: { androidUrl: string | null; iosUrl: string | null; size?: 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-14 px-5 min-w-[190px]' : 'h-12 px-4 min-w-[160px]';
  const cls = `inline-flex items-center gap-3 rounded-2xl bg-black text-white hover:bg-neutral-800 transition ${h}`;
  return (
    <div className="flex flex-wrap justify-center gap-3" dir="ltr">
      {androidUrl && (
        <a href={androidUrl} target="_blank" rel="noopener" className={cls}>
          <AndroidMark className="h-7 w-7 text-[#3DDC84]" />
          <span className="text-start leading-tight"><span className="block text-[10px] opacity-80">GET IT ON</span><span className="block text-base font-semibold">Google Play</span></span>
        </a>
      )}
      {iosUrl && (
        <a href={iosUrl} target="_blank" rel="noopener" className={cls}>
          <AppleMark className="h-7 w-7" />
          <span className="text-start leading-tight"><span className="block text-[10px] opacity-80">Download on the</span><span className="block text-base font-semibold">App Store</span></span>
        </a>
      )}
    </div>
  );
}

/** Strip shown at the bottom of a storefront when the merchant turned on "show app links". */
export function AppDownloadBar({ appName, icon, androidUrl, iosUrl, themeColor }: { appName: string; icon: string; androidUrl: string | null; iosUrl: string | null; themeColor: string }) {
  return (
    <section dir="rtl" className="px-4 pt-8 pb-28 sm:pb-10" style={{ background: `${themeColor}14` }}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <img src={icon} alt="" className="h-14 w-14 rounded-2xl shadow-md bg-white" />
          <div>
            <p className="font-bold text-lg">حمّل تطبيق {appName}</p>
            <p className="text-sm opacity-70">تسوّق أسرع وتابع طلباتك من جوالك</p>
          </div>
        </div>
        <AppDownloadButtons androidUrl={androidUrl} iosUrl={iosUrl} />
      </div>
    </section>
  );
}
