import type { Metadata } from 'next';
import { ChatWidget } from '@/components/storefront/ChatWidget';
import { StorefrontLanguage } from '@/components/storefront/StorefrontLanguage';
import { fetchStoreMeta } from './lib-store';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const store = await fetchStoreMeta(params.slug);
  if (!store?.name) return {};
  return { title: store.name, description: store.description ?? undefined };
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const store = await fetchStoreMeta(params.slug);
  return (
    <>
      {children}
      <ChatWidget slug={params.slug} />
      {store && <StorefrontLanguage slug={params.slug} languages={store.languages} />}
    </>
  );
}
