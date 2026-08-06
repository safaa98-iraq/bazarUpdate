'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { useCartStore } from '@/lib/stores/cart.store';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Package, Lock, Share2, Copy, Check, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { ProductPublic } from '@storebuilder/types';

interface StoreInfo { name: string; theme: string; logo?: string; merchantPlan?: string; }
interface SharedCartItem { productId: string; quantity: number; product: ProductPublic; }

function ShareCartModal({ slug, theme, onClose }: { slug: string; theme: string; onClose: () => void }) {
  const { items } = useCartStore();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.post<{ success: boolean; data: { shareId: string } }>(`/api/storefront/${slug}/cart/share`, {
      items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
    }, { noAuth: true })
      .then(r => setLink(`${window.location.origin}/store/${slug}/cart?shared=${r.data.shareId}`))
      .catch((e: unknown) => { toast.error(e instanceof Error ? e.message : 'فشل إنشاء رابط المشاركة'); onClose(); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('تم نسخ الرابط');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Share2 className="h-4 w-4" style={{ color: theme }} /> مشاركة السلة</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" style={{ color: theme }} /></div>
        ) : link ? (
          <>
            <p className="text-xs text-gray-500 mb-3">أرسل هذا الرابط لأي شخص ليرى نفس المنتجات في سلته فوراً.</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border" style={{ borderColor: '#ECE6F0' }}>
              <span className="flex-1 text-xs font-mono truncate text-gray-600" dir="ltr">{link}</span>
              <button onClick={copy} className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-white transition" style={{ background: theme }}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CartPageContent() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, removeItem, updateQuantity, total, addItem } = useCartStore();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: StoreInfo }>(`/api/storefront/${slug}`, { noAuth: true })
      .then(r => setStore(r.data)).catch(() => null);
  }, [slug]);

  useEffect(() => {
    if (store?.name) document.title = `السلة — ${store.name}`;
  }, [store?.name]);

  useEffect(() => {
    const sharedId = searchParams.get('shared');
    if (!sharedId) return;
    api.get<{ success: boolean; data: SharedCartItem[] }>(`/api/storefront/${slug}/cart/shared/${sharedId}`, { noAuth: true })
      .then(r => {
        (r.data ?? []).forEach(i => addItem(i.product, i.quantity));
        toast.success('تم استيراد السلة المشتركة إلى سلتك');
        router.replace(`/store/${slug}/cart`);
      })
      .catch(() => toast.error('تعذر تحميل السلة المشتركة'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, searchParams]);

  const theme = store?.theme ?? '#2F2E4B';
  const canShare = store?.merchantPlan === 'PRO' || store?.merchantPlan === 'ENTERPRISE';

  if (items.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl" style={{ background: '#F5EFFA' }}>
      <div className="text-center px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${theme}15` }}>
          <ShoppingBag className="h-10 w-10" style={{ color: theme }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">سلتك فارغة</h2>
        <p className="text-gray-500 mb-6">لم تضف أي منتجات بعد</p>
        <Link href={`/store/${slug}`}
          className="inline-block px-8 py-3 font-bold text-white rounded-2xl transition hover:opacity-90"
          style={{ background: theme }}>
          تصفح المنتجات
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#F7F5FC' }}>
      {/* Navbar */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition" style={{ color: theme }}>
            <ArrowRight className="h-4 w-4" />
            متابعة التسوق
          </Link>
          <div className="flex items-center gap-3">
            {canShare && (
              <button onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border transition hover:bg-gray-50"
                style={{ color: theme, borderColor: '#ECE6F0' }}>
                <Share2 className="h-3.5 w-3.5" /> مشاركة السلة
              </button>
            )}
            <span className="text-sm text-gray-500 font-medium">{items.length} منتج{items.length !== 1 ? '' : ''}</span>
          </div>
        </div>
      </nav>

      {showShare && <ShareCartModal slug={slug} theme={theme} onClose={() => setShowShare(false)} />}

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">سلة التسوق</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#F5EFFA' }}>
                  {item.product.images?.[0]
                    ? <Image src={item.product.images[0]} alt={item.product.name} width={80} height={80} className="w-full h-full object-cover" />
                    : <div className="h-full w-full flex items-center justify-center text-gray-300"><Package size={22} /></div>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{item.product.name}</p>
                  {item.variantLabel && <p className="text-xs text-gray-400 truncate">{item.variantLabel}</p>}
                  <p className="font-bold mt-0.5" style={{ color: theme }}>{formatCurrency(item.product.price)}</p>
                </div>

                <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: '#ECE6F0' }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2.5 py-2 hover:bg-gray-50 transition">
                    <Minus className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                  <span className="px-3 text-sm font-bold text-gray-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-2.5 py-2 hover:bg-gray-50 transition">
                    <Plus className="h-3.5 w-3.5 text-gray-600" />
                  </button>
                </div>

                <p className="font-bold text-gray-900 w-20 text-center text-sm">
                  {formatCurrency(item.product.price * item.quantity)}
                </p>

                <button onClick={() => removeItem(item.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl p-6 h-fit shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4 text-base">ملخص الطلب</h2>
            <div className="space-y-3 text-sm mb-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span className="truncate flex-1 ml-2">{item.product.name}{item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}</span>
                  <span className="font-medium flex-shrink-0">{formatCurrency(item.product.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold text-gray-900 text-base" style={{ borderColor: '#ECE6F0' }}>
                <span>المجموع</span>
                <span style={{ color: theme }}>{formatCurrency(total())}</span>
              </div>
            </div>

            <Link href={`/store/${slug}/checkout`}
              className="block w-full py-3.5 font-bold text-center text-white rounded-2xl transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${theme}, #DB6E93)` }}>
              إتمام الطلب ←
            </Link>

            <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1"><Lock size={12} /> بياناتك محمية وآمنة</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5FC' }}><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
      <CartPageContent />
    </Suspense>
  );
}
