'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Smartphone, ExternalLink, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, type Plan } from '@/lib/plan-features';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type App = {
  enabled: boolean; appName: string; shortName: string; icon: string | null; themeColor: string; installPrompt: boolean;
  nativeStatus: 'NONE' | 'REQUESTED' | 'IN_REVIEW' | 'PUBLISHED'; nativePlatforms: string[]; androidUrl: string | null; iosUrl: string | null;
};
const NATIVE_LABEL: Record<App['nativeStatus'], string> = { NONE: '', REQUESTED: 'تم استلام طلبك — سنتواصل معك', IN_REVIEW: 'قيد المراجعة في المتجر', PUBLISHED: 'منشور ✓' };

export default function StoreAppPage() {
  useDocumentTitle('تطبيق المتجر');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const allowed = canUseFeature(plan, 'store_app');
  const [app, setApp] = useState<App | null>(null);
  const [slug, setSlug] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['android']);

  useEffect(() => {
    api.get<{ data: { app: App; slug: string } }>('/api/stores/my/features').then(r => { setApp(r.data.app); setSlug(r.data.slug); }).catch(() => null);
  }, []);

  const save = async () => {
    if (!app) return;
    try { const r = await api.put<{ data: App }>('/api/stores/my/features/app', app); setApp(r.data); toast.success('تم حفظ التطبيق'); }
    catch (e) { toast.error((e as Error).message); }
  };
  const requestNative = async () => {
    try { const r = await api.post<{ data: App }>('/api/stores/my/features/app/native-request', { platforms }); setApp(r.data); toast.success('تم إرسال الطلب'); }
    catch (e) { toast.error((e as Error).message); }
  };

  const storeUrl = typeof window !== 'undefined' && slug ? `${window.location.origin}/store/${slug}` : '';

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <h1 className="bz-large-title">تطبيق المتجر</h1>
      <p className="text-sm text-bz-muted mt-1 mb-6">تطبيق باسم متجرك وشعاره يثبّته زبائنك على أندرويد وآيفون — يفتح بشاشة كاملة بدون متصفح، ويعمل فوراً بدون انتظار متجر التطبيقات.</p>
      {!allowed && <UpgradeNotice feature="store_app" />}
      {allowed && app && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <section className="bz-card p-5 space-y-3">
              <label className="flex items-center gap-3"><input type="checkbox" checked={app.enabled} onChange={e => setApp({ ...app, enabled: e.target.checked })} /><span className="font-semibold">تفعيل التطبيق لمتجري</span></label>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><p className="text-sm font-semibold mb-1">اسم التطبيق</p><input maxLength={45} className="w-full h-10 px-3 border border-bz-line" value={app.appName} onChange={e => setApp({ ...app, appName: e.target.value })} /></div>
                <div><p className="text-sm font-semibold mb-1">الاسم تحت الأيقونة (12 حرفاً)</p><input maxLength={12} className="w-full h-10 px-3 border border-bz-line" value={app.shortName} onChange={e => setApp({ ...app, shortName: e.target.value })} /></div>
                <div><p className="text-sm font-semibold mb-1">رابط الأيقونة (مربعة 512×512)</p><input dir="ltr" placeholder="يُستخدم شعار المتجر إن تُرك فارغاً" className="w-full h-10 px-3 border border-bz-line text-sm" value={app.icon ?? ''} onChange={e => setApp({ ...app, icon: e.target.value })} /></div>
                <div><p className="text-sm font-semibold mb-1">لون التطبيق</p><input type="color" className="h-10 w-20 border border-bz-line" value={app.themeColor} onChange={e => setApp({ ...app, themeColor: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-3"><input type="checkbox" checked={app.installPrompt} onChange={e => setApp({ ...app, installPrompt: e.target.checked })} /><span className="text-sm">اعرض للزبائن بطاقة «ثبّت التطبيق» في المتجر</span></label>
              <button onClick={save} className="bz-btn"><Save className="h-4 w-4" /> حفظ</button>
            </section>

            <section className="bz-card p-5">
              <div className="flex items-center gap-3 mb-2"><ClayIcon name="star" size={40} /><h2 className="bz-headline">نشر على Google Play و App Store</h2></div>
              <p className="text-sm text-bz-muted leading-7 mb-3">نجهّز نسخة أصلية من تطبيقك ونرفعها على المتاجر باسمك. يتطلب حساب مطوّر (Google Play: 25$ مرة واحدة، Apple: 99$ سنوياً).</p>
              {app.nativeStatus !== 'NONE' ? (
                <span className="bz-chip bg-bz-brand-50 text-bz-brand-600">{NATIVE_LABEL[app.nativeStatus]}</span>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {['android', 'ios'].map(p => (
                    <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={platforms.includes(p)} onChange={() => setPlatforms(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p])} />{p === 'android' ? 'أندرويد' : 'آيفون'}</label>
                  ))}
                  <button onClick={requestNative} disabled={!platforms.length} className="bz-btn bz-btn-ink h-10"><Send className="h-4 w-4" /> اطلب النشر</button>
                </div>
              )}
              {(app.androidUrl || app.iosUrl) && (
                <div className="flex gap-2 mt-3">
                  {app.androidUrl && <a href={app.androidUrl} target="_blank" className="bz-btn bz-btn-outline h-9 text-sm">Google Play</a>}
                  {app.iosUrl && <a href={app.iosUrl} target="_blank" className="bz-btn bz-btn-outline h-9 text-sm">App Store</a>}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:col-span-2">
            <p className="text-sm font-semibold mb-2">كيف يبدو على جوال الزبون</p>
            <div className="mx-auto w-[220px] rounded-[36px] border-[8px] border-bz-ink bg-gradient-to-b from-[#BDE6FC] to-[#E3F5FE] p-5 h-[400px]">
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[0, 1, 2, 3, 4].map(i => <div key={i} className="aspect-square rounded-2xl bg-white/60" />)}
                <div className="text-center">
                  <img src={slug ? `/store/${slug}/app-icon/192` : ''} alt="" className="aspect-square w-full rounded-2xl shadow-md bg-white" />
                  <p className="text-[10px] mt-1 font-semibold truncate">{app.shortName}</p>
                </div>
              </div>
            </div>
            {storeUrl && app.enabled && (
              <div className="bz-card p-4 mt-4 text-sm leading-7">
                <p className="font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4" /> جرّبه الآن</p>
                <p className="text-bz-muted">افتح متجرك من جوالك ← «ثبّت التطبيق» (أندرويد) أو مشاركة ← «إضافة إلى الشاشة الرئيسية» (آيفون).</p>
                <a href={storeUrl} target="_blank" className="text-bz-brand-600 font-semibold inline-flex items-center gap-1 mt-1" dir="ltr">{storeUrl.replace(/^https?:\/\//, '')} <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
