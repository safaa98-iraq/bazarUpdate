'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Install the store app" card (Android/Chrome install prompt, iOS instructions). */
export function InstallAppPrompt({ slug, appName, icon, themeColor }: { slug: string; appName: string; icon: string; themeColor: string }) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const key = `bz_install_dismissed_${slug}`;

  useEffect(() => {
    // Register the store's service worker (scope = this store only)
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`/store/${slug}/sw.js`, { scope: `/store/${slug}/` }).catch(() => null);

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(key); } catch { /* ignore */ }
    if (standalone || dismissed) return;

    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setShow(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos) { setIos(true); const t = setTimeout(() => setShow(true), 4000); return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); }; }
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [slug, key]);

  if (!show) return null;
  const dismiss = () => { setShow(false); try { localStorage.setItem(key, '1'); } catch { /* ignore */ } };
  const install = async () => { if (!evt) return; await evt.prompt(); await evt.userChoice.catch(() => null); dismiss(); };

  return (
    <div className="fixed inset-x-3 bottom-20 z-[60] sm:left-auto sm:right-4 sm:w-[360px] print:hidden">
      <div className="rounded-2xl bg-white shadow-2xl border border-black/5 p-4 flex items-center gap-3" style={{ animation: 'bz-sheet-in .3s ease' }}>
        <img src={icon} alt="" className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate"><span>ثبّت التطبيق</span> — <span data-no-translate>{appName}</span></p>
          <p className="text-xs text-gray-500">{ios ? 'اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»' : 'أضفه إلى شاشتك الرئيسية لتسوق أسرع'}</p>
        </div>
        {ios ? <Share className="h-5 w-5 text-gray-400" /> : (
          <button onClick={install} className="h-9 px-3 rounded-full text-white text-sm font-bold flex items-center gap-1" style={{ background: themeColor }}>
            <Download className="h-4 w-4" /> <span>تثبيت</span>
          </button>
        )}
        <button onClick={dismiss} aria-label="ليس الآن" className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
