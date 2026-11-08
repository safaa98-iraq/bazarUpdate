import { NextResponse } from 'next/server';
import { fetchStoreMeta } from '../lib-store';

/** Per-store Web App Manifest — makes each storefront installable as its own app. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const store = await fetchStoreMeta(params.slug);
  if (!store?.app) return new NextResponse('Not found', { status: 404 });
  const base = `/store/${params.slug}`;
  const manifest = {
    id: `${base}/`,
    name: store.app.appName,
    short_name: store.app.shortName,
    description: store.description ?? store.app.appName,
    lang: store.languages[0] ?? 'ar',
    dir: 'rtl',
    start_url: `${base}?source=app`,
    scope: `${base}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: store.app.themeColor,
    icons: [
      { src: `${base}/app-icon/192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/app-icon/512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${base}/app-icon/512?maskable=1`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return NextResponse.json(manifest, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=300' } });
}
