import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function generateMetadata({ params }: { params: { slug: string; id: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/api/storefront/${params.slug}/products/${params.id}`, { cache: 'no-store' });
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

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
