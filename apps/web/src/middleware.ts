import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getAppHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').hostname;
  } catch {
    return 'localhost';
  }
}

async function resolveCustomDomain(host: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/storefront/resolve-domain?host=${encodeURIComponent(host)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json() as { data?: { slug: string | null } };
    return data?.slug ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sb_token')?.value;
  const host = (request.headers.get('host') ?? '').split(':')[0];
  const appHost = getAppHost();

  // ── Custom domain routing ──────────────────────────────────────────────────
  // If the request's Host header is a merchant's verified custom domain (not our
  // own app domain), rewrite it to their storefront under /store/[slug].
  const isAssetOrApi = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.');
  const isOwnHost = host === appHost || host === 'localhost' || host === '127.0.0.1';
  if (host && !isOwnHost && !isAssetOrApi && !pathname.startsWith('/store/')) {
    const slug = await resolveCustomDomain(host);
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/store/${slug}${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // ── Auth guards ─────────────────────────────────────────────────────────────
  if ((pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname.startsWith('/admin')) {
    try {
      const part = token.split('.')[1];
      if (part) {
        const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.role !== 'SUPER_ADMIN') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    } catch { /* ignore malformed token */ }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
