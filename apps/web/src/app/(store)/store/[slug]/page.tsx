'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/lib/stores/cart.store';
import { useWishlistStore } from '@/lib/stores/wishlist.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ProductPublic, StorePublic, BrandPublic } from '@storebuilder/types';
import { ShoppingCart, Search, Mail, Copy, Check, Star, X, Package, Lock, Instagram, Facebook, Truck, Heart, User as UserIcon, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { StoreAdPopup } from '@/components/storefront/StoreAdPopup';
import { RecentlyViewed } from '@/components/storefront/RecentlyViewed';

interface BuilderSection {
  id: string; type: string; visible: boolean;
  settings: Record<string, string | number | boolean>;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  bgColor: string;
  textColor: string;
}

interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
}

const DEFAULT_SECTIONS: BuilderSection[] = [
  { id: 'hero-default', type: 'hero', visible: true, settings: { title: 'مرحباً بك في متجرنا', subtitle: 'اكتشف أفضل المنتجات', buttonText: 'تسوق الآن', backgroundColor: '#2F2E4B', height: 'large', textAlign: 'center' } },
  { id: 'products-default', type: 'products', visible: true, settings: { title: 'منتجاتنا المميزة', columns: 4, limit: 8, showComparePrice: true } },
];

function WhatsAppGlyph({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.35 5.06L2 22l5.06-1.32A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm5.2 14.15c-.22.62-1.28 1.18-1.77 1.24-.45.06-1.02.08-1.65-.1-.38-.11-.87-.28-1.5-.55-2.64-1.14-4.36-3.79-4.5-3.97-.13-.18-1.08-1.44-1.08-2.74 0-1.3.68-1.94.93-2.2.24-.27.53-.33.7-.33h.5c.16 0 .38-.06.6.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.13.29-.26.44-.13.16-.28.35-.4.47-.13.13-.27.28-.12.55.15.27.68 1.11 1.46 1.79 1 .88 1.85 1.15 2.11 1.28.27.13.42.11.58-.07.16-.18.67-.78.85-1.05.18-.27.36-.22.6-.13.24.09 1.53.72 1.79.85.27.13.44.2.51.31.07.13.07.71-.15 1.33Z" />
    </svg>
  );
}
function TikTokGlyph({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M16.8 2h-3.2v13.4a2.6 2.6 0 1 1-1.9-2.5V9.3a6 6 0 1 0 5.1 5.94V9.1a7.3 7.3 0 0 0 4.2 1.34V7.14A4.4 4.4 0 0 1 16.8 2Z" />
    </svg>
  );
}
function SnapchatGlyph({ size = 18, color = '#000' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path fill={color} d="M12 2a7 7 0 0 1 7 7c0 3.5 1 5 2 6l-2 1v1c-2 1-4 1-5 1a4.4 4.4 0 0 1-4 2 4.4 4.4 0 0 1-4-2c-1 0-3 0-5-1v-1l-2-1c1-1 2-2.5 2-6a7 7 0 0 1 7-7z" />
    </svg>
  );
}

function StoreSocialBar({ links }: { links?: StorePublic['socialLinks'] }) {
  if (!links) return null;
  const items: { key: string; href: string; bg: string; icon: React.ReactNode; label: string }[] = [];

  if (links.instagram) items.push({ key: 'ig', href: `https://instagram.com/${links.instagram.replace(/^@/, '')}`, bg: 'linear-gradient(135deg,#833AB4,#DB6E93,#F5A623)', icon: <Instagram size={16} color="#fff" strokeWidth={2} />, label: 'إنستغرام' });
  if (links.whatsapp) items.push({ key: 'wa', href: `https://wa.me/${links.whatsapp.replace(/[^\d]/g, '')}`, bg: '#25D366', icon: <WhatsAppGlyph size={16} />, label: 'واتساب' });
  if (links.facebook) items.push({ key: 'fb', href: links.facebook.startsWith('http') ? links.facebook : `https://facebook.com/${links.facebook}`, bg: '#1877F2', icon: <Facebook size={14} color="#fff" strokeWidth={2} />, label: 'فيسبوك' });
  if (links.tiktok) items.push({ key: 'tt', href: `https://tiktok.com/@${links.tiktok.replace(/^@/, '')}`, bg: '#000', icon: <TikTokGlyph size={16} />, label: 'تيك توك' });
  if (links.snapchat) items.push({ key: 'sc', href: `https://snapchat.com/add/${links.snapchat.replace(/^@/, '')}`, bg: '#FFFC00', icon: <SnapchatGlyph size={16} color="#000" />, label: 'سناب شات' });

  const hasPartners = (links.deliveryPartners?.length ?? 0) > 0;
  if (!items.length && !hasPartners) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {items.length > 0 && (
        <div className="flex items-center gap-2">
          {items.map(it => (
            <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" title={it.label}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:opacity-85"
              style={{ background: it.bg }}>
              {it.icon}
            </a>
          ))}
        </div>
      )}
      {hasPartners && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center px-4">
          <Truck className="h-3.5 w-3.5 text-gray-400" />
          {links.deliveryPartners!.map((p, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Scrolling Banner ───────────────────────────────────────────────────────────
function ScrollingBanner({ banners }: { banners: Banner[] }) {
  const active = banners.filter(b => b);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), 4000);
    return () => clearInterval(t);
  }, [active.length]);
  if (!active.length) return null;
  const b = active[idx];
  return (
    <div style={{ background: b.bgColor, color: b.textColor, padding: '10px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 100%', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{b.title}</span>
        {b.subtitle && <span style={{ fontSize: 13, opacity: 0.8, marginRight: 8 }}> · {b.subtitle}</span>}
        {b.linkUrl && <a href={b.linkUrl} style={{ color: b.textColor, fontWeight: 700, fontSize: 12, marginRight: 12, opacity: 0.9, textDecoration: 'underline' }}>اعرف المزيد</a>}
      </div>
      {active.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4 }}>
          {active.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 18 : 6, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'width .3s' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Promo Image Banners (real StoreBanner records, clickable) ──────────────────
function PromoBannerCarousel({ banners }: { banners: PromoBanner[] }) {
  const active = banners.filter(b => b.imageUrl);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), 5000);
    return () => clearInterval(t);
  }, [active.length]);
  if (!active.length) return null;
  const b = active[idx];

  const content = (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 5', minHeight: 140, borderRadius: 16, overflow: 'hidden', background: '#F5EFFA' }}>
      <Image src={b.imageUrl as string} alt={b.title} fill className="object-cover" sizes="100vw" />
      {(b.title || b.subtitle) && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 55%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
          {b.title && <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, textShadow: '0 2px 8px rgba(0,0,0,.3)' }}>{b.title}</span>}
          {b.subtitle && <span style={{ color: '#fff', fontWeight: 500, fontSize: 13, opacity: 0.9, marginTop: 4 }}>{b.subtitle}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1152, margin: '16px auto 0', padding: '0 24px' }}>
      {b.linkUrl ? (
        <a href={b.linkUrl} style={{ display: 'block', cursor: 'pointer' }}>{content}</a>
      ) : content}
      {active.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
          {active.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 18 : 6, height: 4, borderRadius: 99, background: i === idx ? '#2F2E4B' : '#DDD8E8', cursor: 'pointer', transition: 'width .3s' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Countdown Timer ────────────────────────────────────────────────────────────
function CountdownTimer({ hours }: { hours: number }) {
  // Date.now() must not run during render — it would differ between the
  // server-rendered HTML and the client's first render and break hydration.
  // Computing it inside useEffect defers it to after mount (client-only).
  const end = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    end.current = Date.now() + hours * 3600000;
    setLeft(end.current - Date.now());
    const t = setInterval(() => setLeft(Math.max(0, (end.current ?? 0) - Date.now())), 1000);
    return () => clearInterval(t);
  }, [hours]);

  if (left === null) return null;

  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 justify-center mt-4">
      {[[h, 'ساعة'], [m, 'دقيقة'], [s, 'ثانية']].map(([val, label]) => (
        <div key={String(label)} className="flex flex-col items-center">
          <span className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>{pad(Number(val))}</span>
          <span className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, slug, theme, showCompare, showAddToCart, onAddToCart }: {
  product: ProductPublic; slug: string; theme: string;
  showCompare: boolean; showAddToCart: boolean; onAddToCart: () => void;
}) {
  const wishlisted = useWishlistStore(s => s.isWishlisted(slug, product.id));
  const toggleWishlist = useWishlistStore(s => s.toggle);

  return (
    <div className="group rounded-2xl border overflow-hidden transition hover:shadow-lg hover:-translate-y-1 bg-white" style={{ borderColor: '#ECE6F0' }}>
      <div className="relative">
        <Link href={`/store/${slug}/product/${product.id}`} className="block">
          <div className="aspect-square overflow-hidden" style={{ background: '#F5EFFA' }}>
            {product.images?.[0]
              ? <Image src={product.images[0]} alt={product.name} width={300} height={300} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={36} /></div>}
          </div>
        </Link>
        {(product.isBestSeller || product.isNew) && (
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {product.isBestSeller && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ background: theme }}>الأكثر مبيعاً</span>
            )}
            {product.isNew && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white bg-emerald-500">وصل حديثاً</span>
            )}
          </div>
        )}
        <button
          onClick={(e) => { e.preventDefault(); toggleWishlist(slug, product.id); }}
          className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 backdrop-blur transition hover:scale-110"
          aria-label="أضف للمفضلة">
          <Heart className="h-4 w-4" fill={wishlisted ? theme : 'none'} style={{ color: wishlisted ? theme : '#9ca3af' }} />
        </button>
      </div>
      <div className="p-4">
        {product.category && <p className="text-xs font-medium mb-1" style={{ color: theme }}>{product.category.name}</p>}
        <Link href={`/store/${slug}/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 hover:opacity-80 transition line-clamp-2 text-sm mb-1.5">{product.name}</h3>
        </Link>
        {!!product.reviewCount && (
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-xs text-gray-500">{product.avgRating} ({product.reviewCount})</span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-base" style={{ color: theme }}>{formatCurrency(product.price)}</span>
          {showCompare && product.comparePrice && (
            <span className="text-xs text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
          )}
        </div>
        {showAddToCart !== false && (
          <button onClick={onAddToCart} disabled={product.stock === 0}
            className="w-full py-2.5 text-sm font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: product.stock > 0 ? theme : '#9ca3af', color: 'white' }}>
            {product.stock === 0 ? 'نفد المخزون' : 'أضف للسلة'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Video embed URL resolver (YouTube → embed; anything else → null so a native <video> tag is used) ──
function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

// ── Section Renderer ───────────────────────────────────────────────────────────
function RenderSection({ section, products, slug, theme, search, setSearch, addItem, brands, activeBrand, setActiveBrand }: {
  section: BuilderSection; products: ProductPublic[]; slug: string; theme: string;
  search: string; setSearch: (s: string) => void; addItem: (p: ProductPublic) => void;
  brands: BrandPublic[]; activeBrand: string; setActiveBrand: (id: string) => void;
}) {
  const s = section.settings;
  const [copiedCode, setCopiedCode] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!section.visible) return null;

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.modelNumber?.toLowerCase().includes(search.toLowerCase())
  );

  switch (section.type) {
    case 'announcement':
      if (dismissed) return null;
      return (
        <div className="py-2.5 px-4 text-center text-sm font-medium relative"
          style={{ background: String(s.backgroundColor ?? theme), color: String(s.textColor ?? '#fff') }}>
          {s.link ? <a href={String(s.link)}>{String(s.text)}</a> : String(s.text)}
          {s.dismissible && (
            <button onClick={() => setDismissed(true)} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      );

    case 'hero': {
      const heightMap: Record<string, string> = { small: 'py-12', medium: 'py-20', large: 'py-32', fullscreen: 'min-h-screen flex items-center' };
      const hasImg = Boolean(s.backgroundImage);
      return (
        <div className={`${heightMap[String(s.height)] ?? 'py-24'} px-6 relative overflow-hidden`}
          style={{ background: hasImg ? `url(${s.backgroundImage}) center/cover no-repeat` : String(s.backgroundColor ?? theme) }}>
          {hasImg && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Number(s.overlayOpacity ?? 40) / 100})` }} />}
          <div className="relative max-w-4xl mx-auto" style={{ textAlign: String(s.textAlign ?? 'center') as React.CSSProperties['textAlign'] }}>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow leading-tight">{String(s.title)}</h1>
            {s.subtitle && <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">{String(s.subtitle)}</p>}
            {s.buttonText && (
              <a href={String(s.buttonUrl ?? '#products')}
                className="inline-block px-8 py-3.5 rounded-2xl font-bold text-base transition hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                style={{ background: 'white', color: String(s.backgroundColor ?? theme) }}>
                {String(s.buttonText)}
              </a>
            )}
          </div>
        </div>
      );
    }

    case 'discount': {
      const copyCode = () => {
        navigator.clipboard.writeText(String(s.couponCode));
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        toast.success(`تم نسخ الكود: ${s.couponCode}`);
      };
      return (
        <section className="py-14 px-6" style={{ background: String(s.backgroundColor ?? '#2F2E4B') }}>
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4"
              style={{ background: String(s.badgeColor ?? '#DB6E93'), color: 'white' }}>
              {String(s.discountLabel ?? 'عرض خاص')}
            </span>
            <h2 className="text-3xl font-extrabold text-white mb-2">{String(s.title)}</h2>
            {s.subtitle && <p className="mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>{String(s.subtitle)}</p>}
            <button onClick={copyCode}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-mono font-bold text-xl transition hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px dashed rgba(255,255,255,0.4)', letterSpacing: 3 }}>
              {String(s.couponCode)}
              {copiedCode ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 opacity-60" />}
            </button>
            <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>انقر للنسخ</p>
            {s.showTimer && <CountdownTimer hours={Number(s.expiryHours ?? 24)} />}
          </div>
        </section>
      );
    }

    case 'features':
      return (
        <section className="py-14 px-6 max-w-6xl mx-auto">
          {s.title && <h2 className="text-2xl font-bold text-center mb-10" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>}
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(Number(s.columns ?? 4), 4)}, minmax(0,1fr))` }}>
            {[1, 2, 3, 4].map(i => s[`feature${i}Title`] ? (
              <div key={i} className="text-center p-6 rounded-2xl border hover:shadow-md transition" style={{ borderColor: '#ECE6F0' }}>
                {s[`feature${i}Icon`]
                  ? <div className="text-4xl mb-4">{String(s[`feature${i}Icon`])}</div>
                  : <div className="mb-4 flex justify-center"><Star size={36} className="text-gray-400" /></div>}
                <h3 className="font-bold text-gray-900 mb-2">{String(s[`feature${i}Title`])}</h3>
                <p className="text-sm text-gray-500">{String(s[`feature${i}Desc`] ?? '')}</p>
              </div>
            ) : null)}
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="py-14 px-6" style={{ background: '#F5EFFA' }}>
          <div className="max-w-5xl mx-auto">
            {s.title && <h2 className="text-2xl font-bold text-center mb-10" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>}
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => s[`review${i}Name`] ? (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#ECE6F0' }}>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: Number(s[`review${i}Stars`] ?? 5) }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">&ldquo;{String(s[`review${i}Text`] ?? '')}&rdquo;</p>
                  <p className="font-bold text-sm" style={{ color: '#2F2E4B' }}>{String(s[`review${i}Name`])}</p>
                </div>
              ) : null)}
            </div>
          </div>
        </section>
      );

    case 'gallery': {
      const cols = Number(s.columns ?? 3);
      const imgs = [1, 2, 3, 4, 5, 6].map(i => String(s[`image${i}`] ?? '')).filter(Boolean);
      if (!imgs.length) return null;
      return (
        <section className="py-12 px-6 max-w-6xl mx-auto">
          {s.title && <h2 className="text-2xl font-bold mb-6" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {imgs.map((src, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden">
                <Image src={src} alt="" width={400} height={400} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
              </div>
            ))}
          </div>
        </section>
      );
    }

    case 'categories':
      return (
        <section className="py-12 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>
          <div className="flex gap-3 flex-wrap">
            {Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))).map(cat => (
              <button key={cat} onClick={() => setSearch(cat!)}
                className="px-5 py-2.5 rounded-2xl font-medium text-sm transition hover:-translate-y-0.5"
                style={{ background: `${theme}15`, color: theme, border: `1.5px solid ${theme}30` }}>
                {cat}
              </button>
            ))}
          </div>
        </section>
      );

    case 'brands':
      if (brands.length === 0) return null;
      return (
        <section className="py-12 px-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))` }}>
            {brands.slice(0, Number(s.limit ?? 6)).map(brand => (
              <button key={brand.id}
                onClick={() => { setActiveBrand(activeBrand === brand.id ? 'all' : brand.id); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition hover:-translate-y-0.5"
                style={{ borderColor: activeBrand === brand.id ? theme : '#ECE6F0', background: activeBrand === brand.id ? `${theme}0d` : '#fff' }}>
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#F5EFFA' }}>
                  {brand.image
                    ? <Image src={brand.image} alt={brand.name} width={56} height={56} className="w-full h-full object-contain" />
                    : <span className="font-bold text-lg" style={{ color: theme }}>{brand.name.charAt(0)}</span>}
                </div>
                <span className="text-xs font-semibold text-center line-clamp-1" style={{ color: '#2F2E4B' }}>{brand.name}</span>
              </button>
            ))}
          </div>
        </section>
      );

    case 'products':
      return (
        <section id="products" className="py-12 px-6 max-w-6xl mx-auto">
          {s.title && <h2 className="text-2xl font-bold mb-2" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>}
          {s.subtitle && <p className="text-gray-500 mb-8">{String(s.subtitle)}</p>}
          {filtered.length === 0
            ? <div className="text-center py-16 text-gray-400"><p className="text-lg">لا توجد منتجات مطابقة</p></div>
            : <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(Number(s.columns ?? 4), 4)}, minmax(0, 1fr))` }}>
                {filtered.slice(0, Number(s.limit ?? 8)).map(product => (
                  <ProductCard key={product.id} product={product} slug={slug} theme={theme}
                    showCompare={Boolean(s.showComparePrice)} showAddToCart={s.showAddToCart !== false}
                    onAddToCart={() => { addItem(product); toast.success(`${product.name} أُضيف للسلة`); }} />
                ))}
              </div>
          }
        </section>
      );

    case 'about':
      return (
        <section className="py-16 px-6 max-w-5xl mx-auto">
          <div className={`flex gap-12 items-center ${s.imagePosition === 'left' ? 'flex-row-reverse' : ''}`}>
            {s.imageUrl && (
              <div className="w-72 h-72 flex-shrink-0 rounded-3xl overflow-hidden">
                <Image src={String(s.imageUrl)} alt="about" width={320} height={320} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#2F2E4B' }}>{String(s.title)}</h2>
              <p className="text-gray-600 leading-relaxed text-lg">{String(s.content)}</p>
            </div>
          </div>
        </section>
      );

    case 'newsletter':
      return (
        <section className="py-16 px-6 text-center" style={{ background: String(s.backgroundColor ?? '#4A4767') }}>
          <h2 className="text-2xl font-bold text-white mb-2">{String(s.title)}</h2>
          {s.subtitle && <p className="mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>{String(s.subtitle)}</p>}
          <form onSubmit={e => { e.preventDefault(); toast.success('شكراً لاشتراكك!'); }}
            className="flex gap-3 max-w-md mx-auto">
            <input type="email" required placeholder={String(s.placeholder ?? 'أدخل بريدك الإلكتروني')}
              className="flex-1 px-4 py-3 rounded-2xl text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} />
            <button type="submit" className="px-6 py-3 rounded-2xl font-bold text-sm transition hover:opacity-90"
              style={{ background: '#DB6E93', color: 'white' }}>
              {String(s.buttonText ?? 'اشترك')}
            </button>
          </form>
        </section>
      );

    case 'divider':
      return (
        <div style={{ height: Number(s.height ?? 40), display: 'flex', alignItems: 'center', padding: '0 48px' }}>
          {s.showLine && <div style={{ width: '100%', height: 1, background: String(s.lineColor ?? '#ECE6F0') }} />}
        </div>
      );

    case 'video': {
      const url = String(s.videoUrl ?? '');
      if (!url) return null;
      const ratio = String(s.aspectRatio ?? '16:9').replace(':', ' / ');
      const embedUrl = toEmbedUrl(url);
      return (
        <section style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
          {s.title && <h2 style={{ fontFamily: 'inherit', fontWeight: 800, fontSize: 24, textAlign: 'center', margin: '0 0 20px', color: '#2F2E4B' }}>{String(s.title)}</h2>}
          <div style={{ position: 'relative', width: '100%', aspectRatio: ratio, borderRadius: 16, overflow: 'hidden', background: '#000' }}>
            {embedUrl
              ? <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
              : <video src={url} controls style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
          </div>
        </section>
      );
    }

    default: return null;
  }
}

// ── Main Storefront Page ───────────────────────────────────────────────────────
function StorefrontPageContent() {
  const { slug } = useParams() as { slug: string };
  const [storeInfo, setStoreInfo] = useState<StorePublic | null>(null);
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brandsList, setBrandsList] = useState<BrandPublic[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [sections, setSections] = useState<BuilderSection[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const [activeCat, setActiveCat] = useState<string>(() => searchParams.get('category') ?? 'all');
  const [activeBrand, setActiveBrand] = useState<string>(() => searchParams.get('brand') ?? 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    setActiveCat(searchParams.get('category') ?? 'all');
    setActiveBrand(searchParams.get('brand') ?? 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('category'), searchParams.get('brand')]);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);
  const { addItem, setStoreId, itemCount } = useCartStore();
  const customerUser = useAuthStore(s => s.user);
  const wishlistCount = useWishlistStore(s => s.count(slug));

  useEffect(() => {
    async function load() {
      try {
        const [storeRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
          api.get<{ success: boolean; data: StorePublic; suspendReason?: string }>(`/api/storefront/${slug}`, { noAuth: true }),
          api.get<{ success: boolean; data: ProductPublic[] }>(`/api/storefront/${slug}/products`, { noAuth: true }),
          api.get<{ success: boolean; data: { id: string; name: string }[] }>(`/api/storefront/${slug}/categories`, { noAuth: true }),
          api.get<{ success: boolean; data: BrandPublic[] }>(`/api/storefront/${slug}/brands`, { noAuth: true }).catch(() => ({ success: true, data: [] })),
        ]);
        setStoreInfo(storeRes.data);
        setProducts(productsRes.data ?? []);
        setCategories(categoriesRes.data ?? []);
        setBrandsList(brandsRes.data ?? []);
        setStoreId(storeRes.data.id);
        api.get<{ success: boolean; data: PromoBanner[] }>(`/api/banners/storefront/${storeRes.data.id}`, { noAuth: true })
          .then(r => setPromoBanners(r.data ?? []))
          .catch(() => null);
        if (storeRes.data.builderConfig) {
          try {
            const parsed = JSON.parse(storeRes.data.builderConfig);
            if (Array.isArray(parsed)) {
              setSections(parsed);
            } else {
              if (parsed.home) setSections(parsed.home);
              if (Array.isArray(parsed.banners)) setBanners(parsed.banners.filter((b: Banner & { active?: boolean }) => b.active !== false));
            }
          } catch { /* use defaults */ }
        }
      } catch (err: unknown) {
        const e = err as { status?: number; suspendReason?: string; message?: string };
        if (e?.status === 503 || (e?.message && e.message.includes('suspend'))) {
          setSuspendReason(e?.suspendReason ?? 'هذا المتجر متوقف مؤقتاً');
        }
      }
      finally { setLoading(false); }
    }
    load();
  }, [slug, setStoreId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EFFA' }}>
      <div className="animate-spin h-10 w-10 border-4 rounded-full" style={{ borderColor: '#2F2E4B', borderTopColor: 'transparent' }} />
    </div>
  );

  if (suspendReason) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EFFA' }}>
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FEE2E2' }}>
          <Lock size={28} style={{ color: '#DC2626' }} />
        </div>
        <p className="text-xl font-bold mb-2" style={{ color: '#2F2E4B' }}>المتجر موقوف مؤقتاً</p>
        <p className="text-sm text-gray-500 leading-relaxed">{suspendReason}</p>
      </div>
    </div>
  );

  if (!storeInfo) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EFFA' }}>
      <div className="text-center">
        <p className="text-2xl font-bold mb-2" style={{ color: '#2F2E4B' }}>المتجر غير موجود</p>
        <p className="text-gray-500">هذا المتجر غير متاح حالياً</p>
      </div>
    </div>
  );

  const theme = storeInfo.theme ?? '#2F2E4B';
  const merchantPlan = (storeInfo as typeof storeInfo & { merchantPlan?: string }).merchantPlan ?? 'FREE';
  const priceMinNum = priceMin ? Number(priceMin) : null;
  const priceMaxNum = priceMax ? Number(priceMax) : null;
  const filteredProducts = products
    .filter(p => activeCat === 'all' || p.categoryId === activeCat)
    .filter(p => activeBrand === 'all' || p.brandId === activeBrand)
    .filter(p => priceMinNum === null || p.price >= priceMinNum)
    .filter(p => priceMaxNum === null || p.price <= priceMaxNum)
    .filter(p => minRating === 0 || (p.avgRating ?? 0) >= minRating);
  const filtersActive = priceMinNum !== null || priceMaxNum !== null || minRating > 0;

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <ScrollingBanner banners={banners} />
      {/* Navbar */}
      <nav className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2.5">
            {storeInfo.logo
              ? <Image src={storeInfo.logo} alt={storeInfo.name} width={36} height={36} className="rounded-xl object-contain" />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: theme }}>{storeInfo.name.charAt(0)}</div>}
            <span className="font-bold text-gray-900 text-lg">{storeInfo.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج…"
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 w-52"
                style={{ '--tw-ring-color': theme } as React.CSSProperties} />
            </div>
            <Link href={customerUser?.role === 'CUSTOMER' ? '/account/orders' : '/account/login'} className="relative p-2 rounded-xl hover:bg-gray-100 transition" title="حسابي">
              <UserIcon className="h-5 w-5" style={{ color: theme }} />
            </Link>
            <Link href={`/store/${slug}/wishlist`} className="relative p-2 rounded-xl hover:bg-gray-100 transition">
              <Heart className="h-5 w-5" style={{ color: theme }} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                  style={{ background: theme }}>{wishlistCount}</span>
              )}
            </Link>
            <Link href={`/store/${slug}/cart`} className="relative p-2 rounded-xl hover:bg-gray-100 transition">
              <ShoppingCart className="h-5 w-5" style={{ color: theme }} />
              {itemCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                  style={{ background: theme }}>{itemCount()}</span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Category navbar — real links (?category=id), crawlable and shareable */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 24px 8px', marginBottom: 0, scrollbarWidth: 'none' }}>
          <Link
            href={`/store/${slug}`}
            onClick={() => setActiveCat('all')}
            style={{ flexShrink: 0, padding: '8px 20px', borderRadius: 99, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none', background: activeCat === 'all' ? theme : '#F5EFFA', color: activeCat === 'all' ? '#fff' : '#2F2E4B', transition: 'all .2s', textDecoration: 'none' }}>
            الكل
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`/store/${slug}?category=${cat.id}`}
              onClick={() => setActiveCat(cat.id)}
              style={{ flexShrink: 0, padding: '8px 20px', borderRadius: 99, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none', background: activeCat === cat.id ? theme : '#F5EFFA', color: activeCat === cat.id ? '#fff' : '#2F2E4B', transition: 'all .2s', textDecoration: 'none' }}>
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Filters: price range + rating */}
      <div className="max-w-6xl mx-auto px-6 pt-2">
        <button onClick={() => setShowFilters(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          style={{ color: filtersActive ? theme : '#6B7280', background: filtersActive ? `${theme}12` : 'transparent' }}>
          <SlidersHorizontal size={13} /> فلاتر {filtersActive ? '(مفعّلة)' : ''}
        </button>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-4 mt-2 mb-2 p-4 rounded-xl bg-gray-50">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">السعر من</label>
              <input type="number" min={0} value={priceMin} onChange={e => setPriceMin(e.target.value)}
                placeholder="0" className="w-24 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none" style={{ borderColor: '#ECE6F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">إلى</label>
              <input type="number" min={0} value={priceMax} onChange={e => setPriceMax(e.target.value)}
                placeholder="أي سعر" className="w-24 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none" style={{ borderColor: '#ECE6F0' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">التقييم</label>
              <div className="flex items-center gap-1">
                {[0, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition"
                    style={{ borderColor: minRating === r ? theme : '#ECE6F0', background: minRating === r ? `${theme}12` : '#fff', color: minRating === r ? theme : '#6B7280' }}>
                    {r === 0 ? 'الكل' : <>{r}<Star size={11} className="fill-amber-400 text-amber-400" />+</>}
                  </button>
                ))}
              </div>
            </div>
            {filtersActive && (
              <button onClick={() => { setPriceMin(''); setPriceMax(''); setMinRating(0); }}
                className="text-xs font-semibold text-red-500 hover:underline mb-1">مسح الفلاتر</button>
            )}
          </div>
        )}
      </div>

      {/* Promo image banners — real StoreBanner records, clickable */}
      <PromoBannerCarousel banners={promoBanners} />

      {/* Render all sections */}
      {sections.map(section => (
        <RenderSection
          key={section.id}
          section={section}
          products={filteredProducts}
          slug={slug}
          theme={theme}
          search={search}
          setSearch={setSearch}
          addItem={p => { addItem(p); }}
          brands={brandsList}
          activeBrand={activeBrand}
          setActiveBrand={setActiveBrand}
        />
      ))}

      <div className="max-w-6xl mx-auto px-6">
        <RecentlyViewed slug={slug} theme={theme} />
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-gray-400 mt-8">
        <StoreSocialBar links={storeInfo.socialLinks} />
        <div className="pt-2">
          <Mail className="h-4 w-4 inline ml-1" />
          مدعوم بـ <span className="font-semibold" style={{ color: '#DB6E93' }}>بناء المتجر</span>
        </div>
      </footer>

      {/* Google Ads popup — FREE plan only */}
      {merchantPlan === 'FREE' && (
        <StoreAdPopup
          storeName={storeInfo.name}
          storeSlug={slug}
          themeColor={theme}
        />
      )}
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EFFA' }}>
        <div className="animate-spin h-10 w-10 border-4 rounded-full" style={{ borderColor: '#2F2E4B', borderTopColor: 'transparent' }} />
      </div>
    }>
      <StorefrontPageContent />
    </Suspense>
  );
}
