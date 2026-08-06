'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Megaphone, Package } from 'lucide-react';

interface CrossAd {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  storeId: string;
  storeName: string;
  storeSlug: string;
}

export function CrossStoreAds({ excludeStoreId }: { excludeStoreId: string }) {
  const [ads, setAds] = useState<CrossAd[]>([]);

  useEffect(() => {
    api
      .get<{ success: boolean; data: CrossAd[] }>(
        `/api/storefront/cross-ads?excludeStoreId=${excludeStoreId}&limit=4`,
        { noAuth: true }
      )
      .then(r => setAds(r.data ?? []))
      .catch(() => null);
  }, [excludeStoreId]);

  if (ads.length === 0) return null;

  return (
    <div className="mt-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            إعلانات من متاجر أخرى
          </span>
        </div>
        <span className="text-[10px] text-gray-300 border border-gray-200 rounded px-2 py-0.5">
          إعلان مدفوع
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ads.map(ad => (
          <Link
            key={ad.id}
            href={`/store/${ad.storeSlug}/product/${ad.id}`}
            className="group bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition relative"
          >
            {/* Sponsored badge */}
            <span className="absolute top-2 right-2 z-10 text-[9px] font-bold bg-black/40 text-white rounded px-1.5 py-0.5 backdrop-blur-sm">
              مدعوم
            </span>

            <div className="aspect-square bg-gray-50 overflow-hidden">
              {ad.images?.[0] ? (
                <Image
                  src={ad.images[0]}
                  alt={ad.name}
                  width={300}
                  height={300}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <Package size={36} />
                </div>
              )}
            </div>

            <div className="p-2.5">
              <p className="text-xs text-gray-400 mb-0.5 truncate">{ad.storeName}</p>
              <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                {ad.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(ad.price)}
                </span>
                {ad.comparePrice && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatCurrency(ad.comparePrice)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
