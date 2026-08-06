'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ShoppingCart, Store, Package, Minus, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useMarketplaceCart } from '@/lib/stores/marketplace-cart.store';

type Listing = {
  listingId: string; id: string; name: string; description: string;
  price: number; originalPrice: number; images: string[];
  stock: number; unitType: string; unitLabel: string;
  isFeatured: boolean; categoryTag: string | null;
  storeId: string; storeName: string; storeLogo: string | null;
  storeSlug: string; storeDescription: string | null;
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { add } = useMarketplaceCart();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    apiFetch<{ success: boolean; data: Listing }>(`/api/marketplace/products/${id}`, { noAuth: true })
      .then(r => setListing(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (listing?.name) document.title = `${listing.name} — سوق بازار`;
  }, [listing?.name]);

  function handleAdd() {
    if (!listing) return;
    add({
      listingId: listing.listingId,
      productId: listing.id,
      storeId: listing.storeId,
      storeName: listing.storeName,
      name: listing.name,
      image: listing.images?.[0] ?? null,
      price: listing.price,
      unitLabel: listing.unitLabel ?? 'قطعة',
      quantity: qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 animate-pulse">
        <div className="aspect-square bg-gray-100 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-6 bg-gray-100 rounded w-3/4" />
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );

  if (!listing) return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-400">
      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>المنتج غير موجود</p>
      <Link href="/marketplace" className="mt-4 inline-block text-sm underline" style={{ color: '#DB6E93' }}>
        العودة للسوق
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-6">
        <Link href="/marketplace" className="hover:underline">السوق</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        {listing.categoryTag && <><span>{listing.categoryTag}</span><ChevronRight className="h-3.5 w-3.5" /></>}
        <span className="text-gray-600">{listing.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-3">
            {listing.images?.[activeImg]
              ? <img src={listing.images[activeImg]} alt={listing.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <Package className="h-16 w-16" />
                </div>
            }
          </div>
          {listing.images?.length > 1 && (
            <div className="flex gap-2">
              {listing.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${activeImg === i ? 'border-red-400' : 'border-transparent'}`}>
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {listing.isFeatured && (
            <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-3 text-white" style={{ background: '#DB6E93' }}>
              منتج مميز
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.name}</h1>

          {/* Store badge */}
          <Link href={`/marketplace?storeId=${listing.storeId}`}
            className="inline-flex items-center gap-1.5 text-sm mb-4 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition">
            {listing.storeLogo
              ? <img src={listing.storeLogo} className="h-5 w-5 rounded object-cover" alt="" />
              : <Store className="h-4 w-4 text-gray-400" />
            }
            <span className="text-gray-600">{listing.storeName}</span>
          </Link>

          <div className="mb-6">
            <span className="text-3xl font-bold" style={{ color: '#DB6E93' }}>{formatCurrency(listing.price)}</span>
            {listing.originalPrice > listing.price && (
              <span className="mr-2 text-lg text-gray-400 line-through">{formatCurrency(listing.originalPrice)}</span>
            )}
            <p className="text-sm text-gray-500 mt-1">/{listing.unitLabel}</p>
          </div>

          {listing.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">{listing.description}</p>
          )}

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`text-sm font-medium ${listing.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {listing.stock > 0 ? `متوفر (${listing.stock} ${listing.unitLabel})` : 'نفذ المخزون'}
            </span>
          </div>

          {/* Quantity */}
          {listing.stock > 0 && (
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">الكمية:</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty(q => Math.min(listing.stock, q + 1))}
                  className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={listing.stock <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition"
              style={added ? { background: '#22c55e', color: 'white' }
                : listing.stock > 0 ? { background: '#2F2E4B', color: 'white' }
                : { background: '#e5e7eb', color: '#9ca3af' }}
            >
              <ShoppingCart className="h-4 w-4" />
              {added ? 'تمت الإضافة ✓' : 'أضف للسلة'}
            </button>
            <Link href="/marketplace/cart"
              className="px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition text-center">
              السلة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
