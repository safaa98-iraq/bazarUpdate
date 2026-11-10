/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppDownloadButtons } from '@/components/storefront/AppDownloadButtons';
import { fetchStoreMeta } from '../lib-store';

/** Public "download our app" page — the link merchants share or embed on their own website. */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const store = await fetchStoreMeta(params.slug);
  return store?.app ? { title: `تطبيق ${store.app.appName}` } : {};
}

export default async function StoreAppDownloadPage({ params }: { params: { slug: string } }) {
  const store = await fetchStoreMeta(params.slug);
  const app = store?.app;
  if (!app || (!app.androidUrl && !app.iosUrl)) notFound();
  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: `linear-gradient(180deg, ${app.themeColor}22, #fff)` }}>
      <div className="text-center max-w-md">
        <img src={`/store/${params.slug}/app-icon/192`} alt="" className="h-28 w-28 rounded-[28px] shadow-xl mx-auto bg-white" />
        <h1 className="text-3xl font-bold mt-6">{app.appName}</h1>
        {store?.description && <p className="opacity-70 mt-2 leading-7">{store.description}</p>}
        <p className="mt-6 mb-4 font-semibold">حمّل التطبيق الآن</p>
        <AppDownloadButtons androidUrl={app.androidUrl} iosUrl={app.iosUrl} size="lg" />
        <a href={`/store/${params.slug}`} className="inline-block mt-8 text-sm underline opacity-70">أو تصفّح المتجر من المتصفح</a>
      </div>
    </main>
  );
}
