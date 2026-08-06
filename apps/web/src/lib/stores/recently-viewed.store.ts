'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_ITEMS = 12;

interface RecentlyViewedState {
  byStore: Record<string, string[]>; // storeSlug -> productIds, most recent first
  track: (storeSlug: string, productId: string) => void;
  list: (storeSlug: string, excludeId?: string) => string[];
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      byStore: {},
      track: (storeSlug, productId) => {
        set((state) => {
          const current = state.byStore[storeSlug] ?? [];
          const next = [productId, ...current.filter(id => id !== productId)].slice(0, MAX_ITEMS);
          return { byStore: { ...state.byStore, [storeSlug]: next } };
        });
      },
      list: (storeSlug, excludeId) => {
        const ids = get().byStore[storeSlug] ?? [];
        return excludeId ? ids.filter(id => id !== excludeId) : ids;
      },
    }),
    { name: 'sb_recently_viewed' }
  )
);
