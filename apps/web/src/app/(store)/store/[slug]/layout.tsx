import type { Metadata, Viewport } from 'next';
import { ChatWidget } from '@/components/storefront/ChatWidget';
import { StorefrontLanguage } from '@/components/storefront/StorefrontLanguage';
import { InstallAppPrompt } from '@/components/storefront/InstallAppPrompt';
import { AppDownloadBar } from '@/components/storefront/AppDownloadButtons';
import { fetchStoreMeta } from './lib-store';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const store = await fetchStoreMeta(params.slug);
  if (!store?.name) return {};
  return {
    title: store.name,
    description: store.description ?? undefined,
    ...(store.app?.pwa ? {
      manifest: `/store/${params.slug}/manifest.webmanifest`,
      appleWebApp: { capable: true, title: store.app.shortName, statusBarStyle: 'default' },
      icons: { apple: `/store/${params.slug}/app-icon/180` },
    } : {}),
  };
}

export async function generateViewport({ params }: { params: { slug: string } }): Promise<Viewport> {
  const store = await fetchStoreMeta(params.slug);
  return { themeColor: store?.app?.themeColor ?? '#FFFFFF' };
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const store = await fetchStoreMeta(params.slug);
  return (
    <>
      {children}
      {store?.app?.showOnStore && (
        <AppDownloadBar slug={params.slug} appName={store.app.appName} themeColor={store.app.themeColor}
          availability={{ android: !!store.app.android, ios: !!store.app.ios, pwa: store.app.pwa }} />
      )}
      <ChatWidget slug={params.slug} />
      {store && <StorefrontLanguage slug={params.slug} languages={store.languages} />}
      {store?.app?.pwa && store.app.installPrompt && (
        <InstallAppPrompt slug={params.slug} appName={store.app.appName} themeColor={store.app.themeColor}
          icon={`/store/${params.slug}/app-icon/192`} />
      )}
    </>
  );
}
