import type { Metadata } from 'next';
import { ChatWidget } from '@/components/storefront/ChatWidget';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/api/storefront/${params.slug}`, { cache: 'no-store' });
    if (!res.ok) return {};
    const { data } = await res.json() as { data?: { name?: string; description?: string | null } };
    if (!data?.name) return {};
    return {
      title: data.name,
      description: data.description ?? undefined,
    };
  } catch {
    return {};
  }
}

export default function StoreLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  return (
    <>
      {children}
      <ChatWidget slug={params.slug} />
    </>
  );
}
