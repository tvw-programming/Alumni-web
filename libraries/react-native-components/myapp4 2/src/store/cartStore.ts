import { create } from 'zustand';

import type { Product } from '@/services/types';

export interface CartLine {
  productId: string;
  name: string;
  priceMinor: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: Product, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

/**
 * Client state only. Server data lives in React Query — mixing the two into one
 * store is how you end up hand-writing a cache.
 */
export const useCartStore = create<CartState>((set) => ({
  lines: [],
  add: (product, quantity = 1) =>
    set((state) => {
      const existing = state.lines.find((line) => line.productId === product.id);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.productId === product.id ? { ...line, quantity: line.quantity + quantity } : line,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          { productId: product.id, name: product.name, priceMinor: product.priceMinor, quantity },
        ],
      };
    }),
  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((line) => line.productId !== productId)
          : state.lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    })),
  clear: () => set({ lines: [] }),
}));

/** Selectors live next to the store so components never recompute totals. */
export const selectCartCount = (state: CartState): number =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0);

export const selectCartTotalMinor = (state: CartState): number =>
  state.lines.reduce((sum, line) => sum + line.priceMinor * line.quantity, 0);
