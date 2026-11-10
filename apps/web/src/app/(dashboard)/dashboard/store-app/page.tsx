'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink, Clock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, type Plan } from '@/lib/plan-features';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import { AppDownloadButtons } from '@/components/storefront/AppDownloadButtons';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type Status = 'NONE' | 'REQUESTED' | 'IN_PROGRESS' | 'READY';
type Build = { fileName: string; version: string; size: number; uploadedAt: string } | null;
type App = {
  status: Status; requestedAt: string | null; appName: string; themeColor: string; enabled: boolean;
  builds: { android: Build; ios: Build }; showOnStore: boolean;
};

const STATUS_TEXT: Record<Exclude<Status, 'NONE' | 'READY'>, string> = {
  REQUESTED: 'استلمنا طلبك — فريق بازار يجهّز تطبيقك الآن، وستظهر أزرار التحميل هنا فور نشره.',
  IN_PROGRESS: 'تطبيقك قيد التجهيز — ستظهر أزرار التحميل هنا فور جاهزيته.',
};

export default function StoreAppPage() {
  useDocumentTitle('تطبيق المتجر');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const allowed = canUseFeature(plan, 'store_app');
  const [app, setApp] = useState<App | null>(null);
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ data: { app: App; slug: string } }>('/api/stores/my/features').then(r => { setApp(r.data.app); setSlug(r.data.slug); }).catch(() => null);
  }, []);

  const request = async () => {
    setBusy(true);
    try { const r = await api.post<{ data: App }>('/api/stores/my/features/app/request', {}); setApp(r.data); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const setShow = async (showOnStore: boolean) => {
    if (!app) return;
    setApp({ ...app, showOnStore });
    try { const r = await api.put<{ data: App }>('/api/stores/my/features/app/display', { showOnStore }); setApp(r.data); toast.success(showOnStore ? 'ستظهر أزرار التطبيق في متجرك' : 'تم إخفاء أزرار التطبيق من متجرك'); }
    catch (e) { setApp({ ...app }); toast.error((e as Error).message); }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const downloadPage = slug ? `${origin}/store/${slug}/app` : '';
  const availability = { android: !!app?.builds.android, ios: !!app?.builds.ios, pwa: !!app?.enabled };
  const ready = app?.status === 'READY' && (availability.android || availability.ios || availability.pwa);
  const embed = app && ready
    ? `<a href="${downloadPage}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:14px;background:#000;color:#fff;font-family:sans-serif;font-weight:600;text-decoration:none">📱 حمّل تطبيق ${app.appName}</a>`
    : '';
  const copy = (t: string) => { navigator.clipboard.writeText(t).then(() => toast.success('تم النسخ')).catch(() => null); };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
      <h1 className="bz-large-title">تطبيق المتجر</h1>
      <p className="text-sm text-bz-muted mt-1 mb-6">تطبيق أندرويد وآيفون باسم متجرك وشعارك — يجهّزه فريق بازار ويحمّله زبائنك مباشرة من متجرك.</p>
      {!allowed && <UpgradeNotice feature="store_app" />}

      {allowed && app && app.status === 'NONE' && (
        <section className="bz-card p-8 text-center">
          <ClayIcon name="apps" size={72} className="mx-auto !block" />
          <h2 className="bz-title-2 mt-4">هل تريد تطبيقاً لمتجرك؟</h2>
          <p className="text-bz-muted mt-2 leading-7 max-w-md mx-auto">نجهّز لك تطبيق أندرويد وآيفون باسم متجرك وشعارك، ويحمّله زبائنك مباشرة من رابط متجرك — بدون أي تكلفة إضافية ضمن باقتك.</p>
          <button onClick={request} disabled={busy} className="bz-btn mt-6 h-12 px-8 text-base">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} نعم، أريد تطبيقاً
          </button>
        </section>
      )}

      {allowed && app && app.status !== 'NONE' && (
        <div className="space-y-6">
          <section className="bz-card p-6">
            <h2 className="bz-headline mb-1">حمّل تطبيق متجرك</h2>
            <p className="text-sm text-bz-muted mb-5">أندرويد أو آيفون — جرّبه بنفسك وشارك الرابط مع زبائنك.</p>
            {ready ? (
              <AppDownloadButtons slug={slug} availability={availability} size="lg" />
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-3 opacity-50 pointer-events-none select-none" aria-hidden>
                  <AppDownloadButtons slug={slug || 'x'} availability={{ android: true, ios: true, pwa: true }} size="lg" />
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm bg-bz-brand-50 text-bz-brand-600 rounded-xl p-3 leading-6">
                  <Clock className="h-4 w-4 mt-1 flex-shrink-0" /> {STATUS_TEXT[app.status as 'REQUESTED' | 'IN_PROGRESS']}
                </p>
              </>
            )}
          </section>

          <section className="bz-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="bz-headline">ضع رابط التطبيق في موقعي</h2>
                <p className="text-sm text-bz-muted mt-1 leading-6">يظهر لزبائنك شريط «حمّل تطبيقنا» مع زرّي التحميل لأندرويد والآيفون أسفل صفحات متجرك.</p>
              </div>
              <button role="switch" aria-checked={app.showOnStore} disabled={!ready} onClick={() => setShow(!app.showOnStore)}
                className={`relative h-8 w-14 flex-shrink-0 rounded-full transition ${app.showOnStore ? 'bg-bz-brand' : 'bg-bz-line'} disabled:opacity-40`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${app.showOnStore ? 'start-7' : 'start-1'}`} />
              </button>
            </div>
            {!ready && <p className="text-xs text-bz-muted mt-3">يتفعّل هذا الخيار عندما يصبح تطبيقك جاهزاً.</p>}
            {ready && (
              <div className="mt-5 space-y-4 border-t border-bz-line pt-5">
                <div>
                  <p className="text-sm font-semibold mb-1.5">رابط صفحة تحميل التطبيق</p>
                  <div className="flex gap-2">
                    <input readOnly dir="ltr" value={downloadPage} className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-bz-line text-sm bg-bz-bg" />
                    <button onClick={() => copy(downloadPage)} className="bz-btn bz-btn-outline h-10"><Copy className="h-4 w-4" /> نسخ</button>
                    <a href={downloadPage} target="_blank" className="bz-btn bz-btn-plain h-10" aria-label="فتح"><ExternalLink className="h-4 w-4" /></a>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1.5">كود زر التحميل لموقع آخر أو صفحتك على الإنترنت</p>
                  <textarea readOnly dir="ltr" rows={3} value={embed} className="w-full p-3 rounded-xl border border-bz-line text-xs font-mono bg-bz-bg" />
                  <button onClick={() => copy(embed)} className="bz-btn bz-btn-outline h-9 mt-2 text-sm"><Copy className="h-4 w-4" /> نسخ الكود</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
