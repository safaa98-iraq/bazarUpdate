/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppDownloadButtons } from '@/components/storefront/AppDownloadButtons';
import { fetchStoreMeta } from '../lib-store';

/** Public "download our app" page — the link merchants share or put on their own website. */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const store = await fetchStoreMeta(params.slug);
  return store?.app ? { title: `تطبيق ${store.app.appName}` } : {};
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export default async function StoreAppDownloadPage({ params }: { params: { slug: string } }) {
  const store = await fetchStoreMeta(params.slug);
  const app = store?.app;
  if (!app?.ready) notFound();
  const availability = { android: !!app.android, ios: !!app.ios, pwa: app.pwa };
  return (
    <main dir="rtl" className="min-h-screen px-4 py-16" style={{ background: `linear-gradient(180deg, ${app.themeColor}22, #fff)` }}>
      <div className="text-center max-w-md mx-auto">
        <img src={`/store/${params.slug}/app-icon/192`} alt="" className="h-28 w-28 rounded-[28px] shadow-xl mx-auto bg-white" />
        <h1 className="text-3xl font-bold mt-6">{app.appName}</h1>
        {store?.description && <p className="opacity-70 mt-2 leading-7">{store.description}</p>}
        <p className="mt-6 mb-4 font-semibold">حمّل التطبيق الآن</p>
        <AppDownloadButtons slug={params.slug} availability={availability} size="lg" />
        {app.android && <p className="text-xs opacity-60 mt-3">أندرويد · الإصدار {app.android.version} · {mb(app.android.size)}</p>}
      </div>

      <div className="max-w-md mx-auto mt-10 space-y-4 text-sm leading-7">
        {app.android && (
          <section className="rounded-2xl bg-white/80 shadow-sm p-5">
            <h2 className="font-bold mb-1">التثبيت على أندرويد</h2>
            <ol className="list-decimal ps-5 opacity-80">
              <li>اضغط «تحميل التطبيق لأندرويد» وانتظر اكتمال التحميل.</li>
              <li>افتح الملف من الإشعارات أو مجلد التنزيلات.</li>
              <li>إذا ظهر تنبيه، اسمح بـ«التثبيت من هذا المصدر» ثم اضغط «تثبيت».</li>
            </ol>
          </section>
        )}
        {!app.ios && app.pwa && (
          <section id="iphone" className="rounded-2xl bg-white/80 shadow-sm p-5 scroll-mt-6">
            <h2 className="font-bold mb-1">التثبيت على الآيفون</h2>
            <ol className="list-decimal ps-5 opacity-80">
              <li>افتح هذه الصفحة من متصفح Safari.</li>
              <li>اضغط زر المشاركة <span aria-hidden>⬆️</span> أسفل الشاشة.</li>
              <li>اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة» — يظهر التطبيق بأيقونة {app.shortName}.</li>
            </ol>
          </section>
        )}
        <p className="text-center"><a href={`/store/${params.slug}`} className="underline opacity-70">أو تصفّح المتجر من المتصفح</a></p>
      </div>
    </main>
  );
}
