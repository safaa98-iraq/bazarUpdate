'use client';

import Link from 'next/link';
import { ShoppingCart, Trash2, Minus, Plus, Store, ArrowLeft } from 'lucide-react';
import { useMarketplaceCart } from '@/lib/stores/marketplace-cart.store';
import { formatCurrency } from '@/lib/utils';

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CartPage() {
  useDocumentTitle('سلة السوق');
  const { items, remove, updateQty, total } = useMarketplaceCart();

  // Group by store
  const byStore = new Map<string, { storeName: string; items: typeof items }>();
  for (const item of items) {
    if (!byStore.has(item.storeId)) byStore.set(item.storeId, { storeName: item.storeName, items: [] });
    byStore.get(item.storeId)!.items.push(item);
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-200" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">السلة فارغة</h2>
        <p className="text-gray-400 mb-6">لم تضف أي منتجات بعد</p>
        <Link href="/marketplace"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm"
          style={{ background: '#2F2E4B' }}>
          <ArrowLeft className="h-4 w-4" />
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" style={{ color: '#DB6E93' }} />
        سلة التسوق
        <span className="text-sm font-normal text-gray-400">({items.length} منتج)</span>
      </h1>

      <div className="space-y-4 mb-6">
        {Array.from(byStore.entries()).map(([storeId, { storeName, items: storeItems }]) => (
          <div key={storeId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Store header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2" style={{ background: '#F8F5FF' }}>
              <Store className="h-4 w-4" style={{ color: '#2F2E4B' }} />
              <span className="text-sm font-semibold" style={{ color: '#2F2E4B' }}>{storeName}</span>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50">
              {storeItems.map(item => (
                <div key={item.listingId} className="flex items-center gap-3 p-4">
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    {item.image
                      ? <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                      : <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/marketplace/product/${item.listingId}`} className="text-sm font-semibold text-gray-800 hover:underline line-clamp-2">
                      {item.name}
                    </Link>
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#DB6E93' }}>
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.price)} × {item.quantity} {item.unitLabel}</p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.listingId, item.quantity - 1)}
                      className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.listingId, item.quantity + 1)}
                      className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button onClick={() => remove(item.listingId)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-500">المجموع الجزئي</span>
          <span className="font-semibold">{formatCurrency(total())}</span>
        </div>
        <div className="flex justify-between text-sm mb-4 pb-4 border-b border-gray-100">
          <span className="text-gray-500">الشحن</span>
          <span className="text-gray-400 text-xs">يحدده البائع</span>
        </div>
        <div className="flex justify-between font-bold mb-5">
          <span>الإجمالي</span>
          <span style={{ color: '#DB6E93' }}>{formatCurrency(total())}</span>
        </div>
        <Link href="/marketplace/checkout"
          className="block w-full text-center py-3 rounded-xl font-semibold text-white text-sm transition hover:opacity-90"
          style={{ background: '#DB6E93' }}>
          إتمام الشراء
        </Link>
        <Link href="/marketplace"
          className="block w-full text-center py-2.5 mt-2 text-sm text-gray-500 hover:text-gray-700 transition">
          متابعة التسوق
        </Link>
      </div>
    </div>
  );
}
