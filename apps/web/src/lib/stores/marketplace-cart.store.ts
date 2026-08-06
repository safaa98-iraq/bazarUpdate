import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  listingId: string;
  productId: string;
  storeId: string;
  storeName: string;
  name: string;
  image: string | null;
  price: number;
  unitLabel: string;
  quantity: number;
};

type MarketplaceCartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  remove: (listingId: string) => void;
  updateQty: (listingId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  itemCount: () => number;
};

export const useMarketplaceCart = create<MarketplaceCartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        set(state => {
          const existing = state.items.find(i => i.listingId === item.listingId);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.listingId === item.listingId
                  ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: item.quantity ?? 1 }] };
        });
      },
      remove: (listingId) => set(state => ({ items: state.items.filter(i => i.listingId !== listingId) })),
      updateQty: (listingId, qty) => {
        if (qty <= 0) { get().remove(listingId); return; }
        set(state => ({ items: state.items.map(i => i.listingId === listingId ? { ...i, quantity: qty } : i) }));
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'marketplace-cart' }
  )
);
