'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/lib/stores/cart.store';
import { useWishlistStore } from '@/lib/stores/wishlist.store';
import { ProductPublic, RecommendedProduct, ProductReviewPublic } from '@storebuilder/types';
import { toast } from 'sonner';
import { ArrowRight, ShoppingCart, Minus, Plus, Sparkles, ShoppingBag, Package, Truck, Lock, Undo2, Heart, Star, MessageSquare, Loader2, BadgeCheck, Clock, Ruler, X } from 'lucide-react';
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed.store';
import { RecentlyViewed } from '@/components/storefront/RecentlyViewed';

interface StoreInfo { id: string; name: string; slug: string; theme: string; logo?: string; merchantPlan?: string; defaultSizeGuide?: string | null; }

function SaleCountdown({ endsAt, theme }: { endsAt: string; theme: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  if (left === null || left <= 0) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="mb-4 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl" style={{ background: `${theme}10` }}>
      <Clock className="h-4 w-4 flex-shrink-0" style={{ color: theme }} />
      <span className="text-xs font-semibold" style={{ color: theme }}>ينتهي العرض خلال:</span>
      <span className="font-mono font-bold text-sm" style={{ color: theme }} dir="ltr">
        {d > 0 ? `${d}ي ` : ''}{pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}

function SizeGuideModal({ content, onClose }: { content: string; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white" style={{ borderColor: '#ECE6F0' }}>
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Ruler className="h-4 w-4" /> دليل المقاسات</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size} className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  );
}

function ReviewsSection({ productId, theme, canComment }: { productId: string; theme: string; canComment: boolean }) {
  const [reviews, setReviews] = useState<ProductReviewPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: ProductReviewPublic[] }>(`/api/reviews/${productId}`, { noAuth: true })
      .then(r => setReviews(r.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [productId]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; data: ProductReviewPublic }>(
        `/api/reviews/${productId}`,
        { customerName: name.trim(), rating, comment: canComment ? comment.trim() || undefined : undefined },
        { noAuth: true }
      );
      setReviews(prev => [res.data, ...prev]);
      setName(''); setRating(5); setComment(''); setShowForm(false);
      toast.success('شكراً لتقييمك!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل إرسال التقييم');
    } finally { setSubmitting(false); }
  };

  if (loading) return null;

  return (
    <div className="mt-14 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">التقييمات</h2>
          {reviews.length > 0 ? (
            <div className="flex items-center gap-2">
              <StarRow rating={avg} />
              <span className="text-sm text-gray-500">{avg.toFixed(1)} ({reviews.length} تقييم)</span>
            </div>
          ) : <p className="text-sm text-gray-400">لا توجد تقييمات بعد — كن أول من يقيّم</p>}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition hover:bg-gray-50"
            style={{ borderColor: theme, color: theme }}>
            <MessageSquare className="h-4 w-4" /> أضف تقييمك
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسمك</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="أحمد محمد"
              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: '#ECE6F0' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">تقييمك</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star size={24} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                </button>
              ))}
            </div>
          </div>
          {canComment ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">تعليقك (اختياري)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={2000}
                placeholder="شاركنا رأيك بالمنتج…"
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none" style={{ borderColor: '#ECE6F0' }} />
            </div>
          ) : (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <BadgeCheck size={13} /> إضافة تعليق نصي متاحة في متاجر خطة الأعمال
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
              style={{ background: theme }}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} إرسال التقييم
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border-b pb-4" style={{ borderColor: '#ECE6F0' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900">{r.customerName}</span>
                <StarRow rating={r.rating} size={12} />
              </div>
              {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem('sb_session');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('sb_session', sid);
  }
  return sid;
}

export default function ProductDetailPage() {
  const { slug, id } = useParams() as { slug: string; id: string };
  const [product, setProduct] = useState<ProductPublic | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const { addItem, itemCount } = useCartStore();
  const wishlisted = useWishlistStore(s => s.isWishlisted(slug, id));
  const toggleWishlist = useWishlistStore(s => s.toggle);
  const tracked = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        const [storeRes, productRes] = await Promise.all([
          api.get<{ success: boolean; data: StoreInfo }>(`/api/storefront/${slug}`, { noAuth: true }),
          api.get<{ success: boolean; data: ProductPublic }>(`/api/storefront/${slug}/products/${id}`, { noAuth: true }),
        ]);
        setStore(storeRes.data);
        setProduct(productRes.data);
        setSelectedSpecs(
          Object.fromEntries((productRes.data.specs ?? []).map(s => [s.name, s.values[0]?.value ?? '']))
        );
        const firstVariant = productRes.data.variants?.find(v => v.isActive) ?? productRes.data.variants?.[0];
        setSelectedVariantOptions(firstVariant?.options ?? {});

        if (!tracked.current) {
          tracked.current = true;
          const sessionId = getOrCreateSessionId();
          api.post('/api/ai/track-view', { productId: id, sessionId }, { noAuth: true }).catch(() => null);
          api.get<{ success: boolean; data: RecommendedProduct[] }>(
            `/api/ai/recommendations/${storeRes.data.id}?sessionId=${sessionId}`, { noAuth: true }
          ).then(r => setRecommendations(r.data ?? [])).catch(() => null);
          useRecentlyViewedStore.getState().track(slug, id);
        }
      } catch { /* handled by loading state */ }
      finally { setLoading(false); }
    }
    load();
  }, [slug, id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EFFA' }}>
      <div className="animate-spin h-10 w-10 border-4 rounded-full" style={{ borderColor: '#2F2E4B', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!product || !store) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EFFA' }}>
      <div className="text-center">
        <p className="text-2xl font-bold mb-2" style={{ color: '#2F2E4B' }}>المنتج غير موجود</p>
        <Link href={`/store/${slug}`} className="text-sm hover:underline" style={{ color: '#DB6E93' }}>العودة إلى المتجر</Link>
      </div>
    </div>
  );

  const theme = store.theme ?? '#2F2E4B';
  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  const hasVariants = !!product.hasVariants && !!product.variants?.length;
  const variantOptionKeys = hasVariants
    ? Array.from(new Set(product.variants!.flatMap(v => Object.keys(v.options))))
    : [];
  const variantOptionValues = (key: string) =>
    Array.from(new Set(product.variants!.map(v => v.options[key]).filter(Boolean)));
  const matchedVariant = hasVariants
    ? product.variants!.find(v =>
        variantOptionKeys.every(k => selectedVariantOptions[k] === v.options[k]))
    : undefined;
  const effectivePrice = matchedVariant?.price ?? product.price;
  const effectiveStock = hasVariants ? (matchedVariant?.stock ?? 0) : product.stock;
  const canAddToCart = hasVariants ? !!matchedVariant && effectiveStock > 0 : effectiveStock > 0;
  const variantLabel = matchedVariant
    ? Object.entries(matchedVariant.options).map(([k, v]) => `${k}: ${v}`).join('، ')
    : '';

  const handleAddToCart = () => {
    if (hasVariants && !matchedVariant) { toast.error('اختر كل الخصائص أولاً'); return; }
    const variant = matchedVariant ? { id: matchedVariant.id, label: variantLabel, price: matchedVariant.price } : undefined;
    addItem(product, quantity, variant);
    toast.success(`تمت الإضافة إلى السلة ✓`);
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2.5">
            {store.logo
              ? <Image src={store.logo} alt={store.name} width={36} height={36} className="rounded-xl object-contain" />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: theme }}>{store.name.charAt(0)}</div>}
            <span className="font-bold text-gray-900 text-lg">{store.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={() => toggleWishlist(slug, id)} className="relative p-2 rounded-xl hover:bg-gray-100 transition">
              <Heart className="h-5 w-5" fill={wishlisted ? theme : 'none'} style={{ color: wishlisted ? theme : '#4B5563' }} />
            </button>
            <Link href={`/store/${slug}/cart`} className="relative p-2 rounded-xl hover:bg-gray-100 transition">
              <ShoppingCart className="h-5 w-5" style={{ color: theme }} />
              {itemCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: theme }}>
                  {itemCount()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link href={`/store/${slug}`} className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition" style={{ color: theme }}>
          <ArrowRight className="h-4 w-4" />
          العودة إلى المتجر
        </Link>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden mb-3" style={{ background: '#F5EFFA' }}>
              {previewImage ?? product.images?.[activeImage]
                ? <Image src={previewImage ?? product.images[activeImage]} alt={product.name} width={600} height={600} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={56} /></div>}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => { setActiveImage(i); setPreviewImage(null); }}
                    className="w-16 h-16 rounded-xl overflow-hidden border-2 transition"
                    style={{ borderColor: !previewImage && i === activeImage ? theme : 'transparent' }}>
                    <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {product.category && (
                <span className="text-sm font-medium" style={{ color: theme }}>{product.category.name}</span>
              )}
              {product.brand && (
                <>
                  {product.category && <span className="text-gray-300">·</span>}
                  <Link href={`/store/${slug}?brand=${product.brand.id}`} className="text-sm font-medium text-gray-500 hover:underline">
                    {product.brand.name}
                  </Link>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5 leading-snug">{product.name}</h1>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {!!product.reviewCount && (
                <div className="flex items-center gap-1.5">
                  <StarRow rating={product.avgRating ?? 0} />
                  <span className="text-xs text-gray-500">({product.reviewCount})</span>
                </div>
              )}
              {product.modelNumber && (
                <span className="text-xs text-gray-400 font-mono" style={{ direction: 'ltr' }}>{product.modelNumber}</span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-extrabold" style={{ color: theme }}>{formatCurrency(effectivePrice)}</span>
              {product.comparePrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-sm font-bold text-white" style={{ background: '#DB6E93' }}>
                    خصم {discount}%
                  </span>
                </>
              )}
            </div>

            {product.saleEndsAt && <SaleCountdown endsAt={product.saleEndsAt} theme={theme} />}

            {/* Stock */}
            <div className="mb-5 flex items-center gap-3 flex-wrap">
              {(!hasVariants || matchedVariant) && effectiveStock > 0
                ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    متوفر في المخزون ({effectiveStock} قطعة)
                  </span>
                : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    نفد المخزون
                  </span>}
              {(product.sizeGuide || store.defaultSizeGuide) && (
                <button onClick={() => setShowSizeGuide(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  style={{ color: theme }}>
                  <Ruler className="h-3.5 w-3.5" /> دليل المقاسات
                </button>
              )}
            </div>

            {/* Specs (color, size, etc.) */}
            {product.specs && product.specs.length > 0 && (
              <div className="mb-5 space-y-4">
                {product.specs.map(spec => (
                  <div key={spec.name}>
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {spec.name}: <span className="font-normal text-gray-500">{selectedSpecs[spec.name]}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {spec.values.map(v => {
                        const isSelected = selectedSpecs[spec.name] === v.value;
                        return (
                          <button key={v.value} type="button"
                            onClick={() => {
                              setSelectedSpecs(s => ({ ...s, [spec.name]: v.value }));
                              if (v.image) setPreviewImage(v.image);
                            }}
                            title={v.value}
                            className="rounded-xl border-2 transition overflow-hidden"
                            style={{ borderColor: isSelected ? theme : '#ECE6F0' }}>
                            {v.image ? (
                              <Image src={v.image} alt={v.value} width={44} height={44} className="w-11 h-11 object-cover" />
                            ) : (
                              <span className="px-3 py-2 text-xs font-medium block" style={{ color: isSelected ? theme : '#4B5563' }}>
                                {v.value}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variants (color/size etc. with real stock) */}
            {hasVariants && (
              <div className="mb-5 space-y-4">
                {variantOptionKeys.map(key => (
                  <div key={key}>
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {key}: <span className="font-normal text-gray-500">{selectedVariantOptions[key] ?? ''}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variantOptionValues(key).map(val => {
                        const isSelected = selectedVariantOptions[key] === val;
                        return (
                          <button key={val} type="button"
                            onClick={() => setSelectedVariantOptions(s => ({ ...s, [key]: val }))}
                            className="px-3.5 py-2 rounded-xl border-2 text-xs font-medium transition"
                            style={{ borderColor: isSelected ? theme : '#ECE6F0', color: isSelected ? theme : '#4B5563' }}>
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {!matchedVariant && (
                  <p className="text-xs text-red-500">هذا المزيج غير متوفر، جرّب خياراً آخر</p>
                )}
              </div>
            )}

            {product.description && (
              <p className="text-gray-600 leading-relaxed mb-6 text-sm">{product.description}</p>
            )}

            {canAddToCart && (
              <>
                {/* Quantity */}
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-sm font-semibold text-gray-700">الكمية</span>
                  <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2.5 hover:bg-gray-50 transition">
                      <Minus className="h-4 w-4 text-gray-600" />
                    </button>
                    <span className="px-5 text-sm font-bold text-gray-900">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                      className="px-3 py-2.5 hover:bg-gray-50 transition">
                      <Plus className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 font-bold rounded-2xl text-white transition hover:opacity-90"
                    style={{ background: theme }}>
                    <ShoppingBag className="h-5 w-5" />
                    أضف إلى السلة
                  </button>
                  <Link href={`/store/${slug}/checkout`}
                    onClick={handleAddToCart}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 font-bold rounded-2xl border-2 transition hover:bg-gray-50"
                    style={{ borderColor: theme, color: theme }}>
                    اشتري الآن
                  </Link>
                </div>
              </>
            )}

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { Icon: Truck, label: 'توصيل سريع' },
                { Icon: Lock, label: 'دفع آمن' },
                { Icon: Undo2, label: 'إرجاع مريح' },
              ].map(b => (
                <span key={b.label} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: `${theme}12`, color: theme }}>
                  <b.Icon size={13} />{b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <ReviewsSection productId={product.id} theme={theme} canComment={store.merchantPlan === 'ENTERPRISE'} />

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5" style={{ color: theme }} />
              <h2 className="text-xl font-bold text-gray-900">قد يعجبك أيضاً</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map(rec => (
                <Link key={rec.id} href={`/store/${slug}/product/${rec.id}`}
                  className="group bg-white border rounded-2xl overflow-hidden hover:shadow-md transition"
                  style={{ borderColor: '#ECE6F0' }}>
                  <div className="aspect-square overflow-hidden" style={{ background: '#F5EFFA' }}>
                    {rec.images?.[0]
                      ? <Image src={rec.images[0]} alt={rec.name} width={300} height={300} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={36} /></div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{rec.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: theme }}>{formatCurrency(rec.price)}</span>
                      {rec.comparePrice && <span className="text-xs text-gray-400 line-through">{formatCurrency(rec.comparePrice)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <RecentlyViewed slug={slug} theme={theme} excludeId={id} />
      </div>

      {showSizeGuide && (
        <SizeGuideModal content={product.sizeGuide || store.defaultSizeGuide || ''} onClose={() => setShowSizeGuide(false)} />
      )}
    </div>
  );
}
