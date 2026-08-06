'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  // storeId -> product ids
  byStore: Record<string, string[]>;
  isWishlisted: (storeId: string, productId: string) => boolean;
  toggle: (storeId: string, productId: string) => void;
  count: (storeId: string) => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      byStore: {},
      isWishlisted: (storeId, productId) => (get().byStore[storeId] ?? []).includes(productId),
      toggle: (storeId, productId) => {
        set((state) => {
          const current = state.byStore[storeId] ?? [];
          const next = current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId];
          return { byStore: { ...state.byStore, [storeId]: next } };
        });
      },
      count: (storeId) => (get().byStore[storeId] ?? []).length,
    }),
    { name: 'sb_wishlist' }
  )
);
