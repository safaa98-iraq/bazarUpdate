import { ImageResponse } from 'next/og';
import { fetchStoreMeta } from '../../lib-store';

/** PNG app icon at an exact size: the store's icon/logo on its brand colour, or its initial. */
export async function GET(req: Request, { params }: { params: { slug: string; size: string } }) {
  const size = params.size === '512' ? 512 : params.size === '180' ? 180 : 192;
  const maskable = new URL(req.url).searchParams.has('maskable');
  const store = await fetchStoreMeta(params.slug);
  const color = store?.app?.themeColor ?? store?.theme ?? '#20A9F4';
  const img = store?.app?.icon ?? store?.logo ?? null;
  const pad = Math.round(size * (maskable ? 0.2 : 0.12));
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: img ? '#ffffff' : color, borderRadius: maskable ? 0 : size * 0.22 }}>
        {img
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={img} width={size - pad * 2} height={size - pad * 2} style={{ objectFit: 'contain' }} alt="" />
          : <span style={{ color: '#fff', fontSize: size * 0.5, fontWeight: 700 }}>{(store?.name ?? 'B').trim().charAt(0).toUpperCase()}</span>}
      </div>
    ),
    { width: size, height: size },
  );
}
