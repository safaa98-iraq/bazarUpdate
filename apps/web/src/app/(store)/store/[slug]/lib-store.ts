const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface PublicStoreMeta {
  name: string; description: string | null; logo: string | null; theme: string;
  languages: ('ar' | 'en' | 'ckb')[];
}

/** Store data needed by the layout (server side, cached briefly). */
export async function fetchStoreMeta(slug: string): Promise<PublicStoreMeta | null> {
  try {
    // Short timeout: a sleeping API must not block the storefront from rendering.
    const res = await fetch(`${API_URL}/api/storefront/${encodeURIComponent(slug)}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const { data } = await res.json() as { data?: PublicStoreMeta };
    if (!data) return null;
    return { ...data, languages: (data.languages ?? ['ar']).filter((l): l is 'ar' | 'en' | 'ckb' => l === 'ar' || l === 'en' || l === 'ckb') };
  } catch {
    return null;
  }
}
