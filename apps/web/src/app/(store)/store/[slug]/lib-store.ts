const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface PublicStoreApp {
  appName: string; shortName: string; icon: string | null; themeColor: string;
  /** Installable web app (manifest) — switched on by the Bazar admin */
  pwa: boolean; installPrompt: boolean;
  /** Store links, set by the Bazar admin once the native app is published */
  androidUrl: string | null; iosUrl: string | null;
  /** Merchant chose to show the download buttons on the storefront */
  showOnStore: boolean;
}
export interface PublicStoreMeta {
  name: string; description: string | null; logo: string | null; theme: string;
  languages: ('ar' | 'ckb')[]; app: PublicStoreApp | null;
}

/** Store data needed by the layout, manifest and icons (server side, cached briefly). */
export async function fetchStoreMeta(slug: string): Promise<PublicStoreMeta | null> {
  try {
    // Short timeout: a sleeping API must not block the storefront from rendering.
    const res = await fetch(`${API_URL}/api/storefront/${encodeURIComponent(slug)}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const { data } = await res.json() as { data?: PublicStoreMeta };
    if (!data) return null;
    return { ...data, languages: (data.languages ?? ['ar']).filter((l): l is 'ar' | 'ckb' => l === 'ar' || l === 'ckb') };
  } catch {
    return null;
  }
}
