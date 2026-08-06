'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { History, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed.store';
import type { ProductPublic } from '@storebuilder/types';

export function RecentlyViewed({ slug, theme, excludeId }: { slug: string; theme: string; excludeId?: string }) {
  const ids = useRecentlyViewedStore(s => s.list(slug, excludeId));
  const [products, setProducts] = useState<ProductPublic[]>([]);

  useEffect(() => {
    if (!ids.length) { setProducts([]); return; }
    api.get<{ success: boolean; data: ProductPublic[] }>(`/api/storefront/${slug}/products?limit=500`, { noAuth: true })
      .then(r => {
        const map = new Map((r.data ?? []).map(p => [p.id, p]));
        setProducts(ids.map(id => map.get(id)).filter((p): p is ProductPublic => !!p));
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, ids.join(',')]);

  if (!products.length) return null;

  return (
    <div className="mt-14">
      <div className="flex items-center gap-2 mb-6">
        <History className="h-5 w-5" style={{ color: theme }} />
        <h2 className="text-xl font-bold text-gray-900">شوهد مؤخراً</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.slice(0, 8).map(p => (
          <Link key={p.id} href={`/store/${slug}/product/${p.id}`}
            className="group bg-white border rounded-2xl overflow-hidden hover:shadow-md transition"
            style={{ borderColor: '#ECE6F0' }}>
            <div className="aspect-square overflow-hidden" style={{ background: '#F5EFFA' }}>
              {p.images?.[0]
                ? <Image src={p.images[0]} alt={p.name} width={300} height={300} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                : <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={36} /></div>}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{p.name}</p>
              <span className="text-sm font-bold" style={{ color: theme }}>{formatCurrency(p.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
