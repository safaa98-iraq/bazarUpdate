'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductPublic } from '@storebuilder/types';
import { api } from '@/lib/api';

export interface CartItem {
  id: string;
  product: ProductPublic;
  quantity: number;
  variantId?: string | null;
  variantLabel?: string | null;
}

interface VariantChoice { id: string; label: string; price: number | null }

interface CartState {
  items: CartItem[];
  storeId: string | null;
  addItem: (product: ProductPublic, quantity?: number, variant?: VariantChoice) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setStoreId: (storeId: string) => void;
  total: () => number;
  itemCount: () => number;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('sb_cart_session');
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem('sb_cart_session', id);
  }
  return id;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Best-effort, debounced full-cart sync to the server — powers abandoned-cart tracking. Never throws.
 *  Variant lines of the same product are merged by productId here since the server cart
 *  only tracks one row per (cart, product) — exact enough for a "did they abandon?" signal. */
function syncCartToServer(storeId: string | null, items: CartItem[]) {
  if (typeof window === 'undefined' || !storeId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const merged = new Map<string, number>();
    for (const i of items) merged.set(i.product.id, (merged.get(i.product.id) ?? 0) + i.quantity);
    api.put(`/api/cart/${storeId}/replace`, {
      items: Array.from(merged, ([productId, quantity]) => ({ productId, quantity })),
    }, { noAuth: true, headers: { 'x-session-id': getSessionId() } }).catch(() => null);
  }, 900);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const lineId = variant ? `${product.id}:${variant.id}` : product.id;
          const effectiveProduct = variant?.price != null ? { ...product, price: variant.price } : product;
          const existing = state.items.find((i) => i.id === lineId);
          const items = existing
            ? state.items.map((i) => i.id === lineId ? { ...i, quantity: i.quantity + quantity } : i)
            : [...state.items, {
                id: lineId, product: effectiveProduct, quantity,
                variantId: variant?.id ?? null, variantLabel: variant?.label ?? null,
              }];
          syncCartToServer(state.storeId, items);
          return { items };
        });
      },
      removeItem: (itemId) => {
        set((state) => {
          const items = state.items.filter((i) => i.id !== itemId);
          syncCartToServer(state.storeId, items);
          return { items };
        });
      },
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set((state) => {
          const items = state.items.map((i) => i.id === itemId ? { ...i, quantity } : i);
          syncCartToServer(state.storeId, items);
          return { items };
        });
      },
      clearCart: () => {
        syncCartToServer(get().storeId, []);
        set({ items: [] });
      },
      setStoreId: (storeId) => set({ storeId }),
      total: () => {
        const { items } = get();
        return items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      },
      itemCount: () => {
        const { items } = get();
        return items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    { name: 'sb_cart' }
  )
);
