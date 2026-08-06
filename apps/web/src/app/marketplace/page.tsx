'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Star, ShoppingCart, Store, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useMarketplaceCart } from '@/lib/stores/marketplace-cart.store';

type Listing = {
  listingId: string; id: string; name: string; description: string;
  price: number; images: string[]; stock: number; unitLabel: string;
  isFeatured: boolean; categoryTag: string | null;
  storeId: string; storeName: string; storeLogo: string | null; storeSlug: string;
};

type Category = { tag: string; count: number };
type StoreItem = { id: string; name: string; slug: string; logo: string | null; productCount: number };

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'featured', label: 'المميز' },
  { value: 'price_asc', label: 'السعر: الأقل' },
  { value: 'price_desc', label: 'السعر: الأعلى' },
];

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function MarketplacePage() {
  useDocumentTitle('السوق');
  const { add } = useMarketplaceCart();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), sort });
      if (search) params.set('search', search);
      if (selectedCategory) params.set('categoryTag', selectedCategory);
      if (selectedStore) params.set('storeId', selectedStore);
      const res = await apiFetch<{ success: boolean; data: Listing[]; pagination: { totalPages: number } }>(
        `/api/marketplace?${params}`, { noAuth: true }
      );
      setListings(res.data ?? []);
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch { /* empty */ }
    setLoading(false);
  }, [page, sort, search, selectedCategory, selectedStore]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  useEffect(() => {
    apiFetch<{ success: boolean; data: Category[] }>('/api/marketplace/categories', { noAuth: true })
      .then(r => setCategories(r.data ?? [])).catch(() => {});
    apiFetch<{ success: boolean; data: StoreItem[] }>('/api/marketplace/stores', { noAuth: true })
      .then(r => setStores(r.data ?? [])).catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleAddToCart(listing: Listing) {
    add({
      listingId: listing.listingId,
      productId: listing.id,
      storeId: listing.storeId,
      storeName: listing.storeName,
      name: listing.name,
      image: listing.images?.[0] ?? null,
      price: listing.price,
      unitLabel: listing.unitLabel ?? 'قطعة',
    });
    setAddedId(listing.listingId);
    setTimeout(() => setAddedId(null), 1500);
  }

  const featured = listings.filter(l => l.isFeatured).slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl p-8 mb-8 text-center text-white" style={{ background: 'linear-gradient(135deg, #2F2E4B 0%, #DB6E93 100%)' }}>
        <h1 className="text-3xl font-bold mb-2">سوق المتاجر</h1>
        <p className="text-white/70 mb-6">تسوق من أفضل المتاجر في مكان واحد</p>
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="flex-1 px-4 py-2.5 rounded-xl text-gray-800 text-sm outline-none"
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl font-semibold text-sm transition" style={{ background: '#DB6E93', color: 'white' }}>
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Featured products */}
      {featured.length > 0 && !search && !selectedCategory && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Star className="h-5 w-5" style={{ color: '#DB6E93' }} />
              منتجات مميزة
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {featured.map(listing => (
              <ProductCard key={listing.listingId} listing={listing} onAdd={() => handleAddToCart(listing)} added={addedId === listing.listingId} />
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`w-56 flex-shrink-0 space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}>
          {/* Sort */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">الترتيب</p>
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { setSort(o.value); setPage(1); }}
                className={`w-full text-right text-sm px-2 py-1.5 rounded-lg mb-0.5 transition ${sort === o.value ? 'font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                style={sort === o.value ? { color: '#DB6E93', background: '#FFF0F2' } : {}}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">الفئات</p>
              <button onClick={() => { setSelectedCategory(''); setPage(1); }}
                className={`w-full text-right text-sm px-2 py-1.5 rounded-lg mb-0.5 transition ${!selectedCategory ? 'font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                style={!selectedCategory ? { color: '#DB6E93', background: '#FFF0F2' } : {}}>
                الكل
              </button>
              {categories.map(c => (
                <button key={c.tag} onClick={() => { setSelectedCategory(c.tag); setPage(1); }}
                  className={`w-full text-right text-sm px-2 py-1.5 rounded-lg mb-0.5 transition flex justify-between items-center ${selectedCategory === c.tag ? 'font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={selectedCategory === c.tag ? { color: '#DB6E93', background: '#FFF0F2' } : {}}>
                  <span>{c.tag}</span>
                  <span className="text-xs text-gray-400">{c.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Stores */}
          {stores.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">المتاجر</p>
              <button onClick={() => { setSelectedStore(''); setPage(1); }}
                className={`w-full text-right text-sm px-2 py-1.5 rounded-lg mb-0.5 flex items-center gap-2 transition ${!selectedStore ? 'font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                style={!selectedStore ? { color: '#DB6E93', background: '#FFF0F2' } : {}}>
                <Store className="h-3.5 w-3.5" /> الكل
              </button>
              {stores.slice(0, 8).map(s => (
                <button key={s.id} onClick={() => { setSelectedStore(s.id); setPage(1); }}
                  className={`w-full text-right text-sm px-2 py-1.5 rounded-lg mb-0.5 flex items-center gap-2 transition ${selectedStore === s.id ? 'font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={selectedStore === s.id ? { color: '#DB6E93', background: '#FFF0F2' } : {}}>
                  {s.logo
                    ? <img src={s.logo} className="h-4 w-4 rounded object-cover" alt="" />
                    : <div className="h-4 w-4 rounded" style={{ background: '#2F2E4B' }} />
                  }
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowFilters(f => !f)} className="md:hidden flex items-center gap-1 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
              <SlidersHorizontal className="h-4 w-4" /> الفلاتر
            </button>
            {(search || selectedCategory || selectedStore) && (
              <button onClick={() => { setSearch(''); setSearchInput(''); setSelectedCategory(''); setSelectedStore(''); setPage(1); }}
                className="text-xs text-red-500 hover:underline mr-auto">
                إلغاء الفلاتر
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                  <div className="h-40 bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد منتجات</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {listings.map(listing => (
                <ProductCard key={listing.listingId} listing={listing} onAdd={() => handleAddToCart(listing)} added={addedId === listing.listingId} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                السابق
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                التالي
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ listing, onAdd, added }: { listing: Listing; onAdd: () => void; added: boolean }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition group">
      <Link href={`/marketplace/product/${listing.listingId}`} className="block">
        <div className="relative h-40 bg-gray-50">
          {listing.images?.[0]
            ? <img src={listing.images[0]} alt={listing.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-gray-200">
                <ShoppingCart className="h-10 w-10" />
              </div>
          }
          {listing.isFeatured && (
            <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#DB6E93' }}>
              مميز
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
            <Store className="h-3 w-3" /> {listing.storeName}
          </p>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">{listing.name}</h3>
          <p className="text-sm font-bold" style={{ color: '#DB6E93' }}>{formatCurrency(listing.price)}</p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          onClick={onAdd}
          disabled={listing.stock <= 0}
          className="w-full py-1.5 rounded-lg text-xs font-semibold transition"
          style={added ? { background: '#22c55e', color: 'white' } : listing.stock > 0 ? { background: '#2F2E4B', color: 'white' } : { background: '#e5e7eb', color: '#9ca3af' }}
        >
          {added ? '✓ تمت الإضافة' : listing.stock <= 0 ? 'نفذ المخزون' : 'أضف للسلة'}
        </button>
      </div>
    </div>
  );
}
