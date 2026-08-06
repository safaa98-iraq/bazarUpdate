'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlistStore } from '@/lib/stores/wishlist.store';
import { useCartStore } from '@/lib/stores/cart.store';
import { formatCurrency } from '@/lib/utils';
import { Heart, Trash2, ArrowRight, Package, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ProductPublic, StorePublic } from '@storebuilder/types';

export default function WishlistPage() {
  const { slug } = useParams() as { slug: string };
  const wishlistIds = useWishlistStore(s => s.byStore[slug] ?? []);
  const toggleWishlist = useWishlistStore(s => s.toggle);
  const { addItem, setStoreId } = useCartStore();

  const [store, setStore] = useState<StorePublic | null>(null);
  const [products, setProducts] = useState<ProductPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: StorePublic }>(`/api/storefront/${slug}`, { noAuth: true }),
      api.get<{ success: boolean; data: ProductPublic[] }>(`/api/storefront/${slug}/products?limit=500`, { noAuth: true }),
    ])
      .then(([storeRes, productsRes]) => {
        setStore(storeRes.data);
        setStoreId(storeRes.data.id);
        setProducts(productsRes.data ?? []);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [slug, setStoreId]);

  useEffect(() => {
    if (store?.name) document.title = `المفضلة — ${store.name}`;
  }, [store?.name]);

  const theme = store?.theme ?? '#2F2E4B';
  const items = products.filter(p => wishlistIds.includes(p.id));

  const handleAddToCart = (product: ProductPublic) => {
    addItem(product, 1);
    toast.success('تمت الإضافة للسلة');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl" style={{ background: '#F5EFFA' }}>
      <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#FBE1EA', borderTopColor: '#2F2E4B' }} />
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl" style={{ background: '#F5EFFA' }}>
      <div className="text-center px-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${theme}15` }}>
          <Heart className="h-10 w-10" style={{ color: theme }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">قائمة المفضلة فارغة</h2>
        <p className="text-gray-500 mb-6">اضغط على أيقونة القلب على أي منتج لإضافته هنا</p>
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
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition" style={{ color: theme }}>
            <ArrowRight className="h-4 w-4" />
            متابعة التسوق
          </Link>
          <span className="text-sm text-gray-500 font-medium">{items.length} منتج</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart className="h-6 w-6" style={{ color: theme }} fill={theme} /> المفضلة
        </h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(product => (
            <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <Link href={`/store/${slug}/product/${product.id}`} className="block relative">
                <div className="aspect-square" style={{ background: '#F5EFFA' }}>
                  {product.images?.[0]
                    ? <Image src={product.images[0]} alt={product.name} width={300} height={300} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32} /></div>}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/store/${slug}/product/${product.id}`}>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1.5">{product.name}</p>
                </Link>
                <p className="font-bold mb-3" style={{ color: theme }}>{formatCurrency(product.price)}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAddToCart(product)} disabled={product.stock === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition disabled:opacity-40"
                    style={{ background: theme, color: '#fff' }}>
                    <ShoppingCart className="h-3.5 w-3.5" /> {product.stock === 0 ? 'نفد المخزون' : 'أضف للسلة'}
                  </button>
                  <button onClick={() => toggleWishlist(slug, product.id)}
                    className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center border transition hover:bg-red-50"
                    style={{ borderColor: '#fca5a5' }} title="إزالة من المفضلة">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
