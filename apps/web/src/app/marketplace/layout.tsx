'use client';

import Link from 'next/link';
import { ShoppingBag, ShoppingCart, Store } from 'lucide-react';
import { useMarketplaceCart } from '@/lib/stores/marketplace-cart.store';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const itemCount = useMarketplaceCart(s => s.itemCount());

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Navbar */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: '#2F2E4B' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#DB6E93' }}>
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">سوق المتاجر</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/marketplace/cart" className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition text-sm">
              <ShoppingCart className="h-5 w-5" />
              <span>السلة</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: '#DB6E93' }}>
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>
            <Link href="/marketplace" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span>التسوق</span>
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-16 py-8 text-center text-sm text-gray-500 border-t border-gray-200">
        <p>سوق المتاجر — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}
