import { ORDERS, PRODUCTS } from './mockData';
import type { Order, Page, Product, ProductQuery } from './types';

/**
 * Stand-in for the real network layer. Swapping this file for `fetch` calls is
 * the only change the app needs — screens talk to hooks, hooks talk to this.
 */

const LATENCY_MS = 550;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Deterministic-ish failure so the error states are actually reachable in dev. */
let productCallCount = 0;

export const api = {
  async listProducts({ search = '', categories = [], cursor = 0, pageSize = 8 }: ProductQuery): Promise<Page<Product>> {
    await delay(LATENCY_MS);
    productCallCount += 1;

    const term = search.trim().toLowerCase();
    const filtered = PRODUCTS.filter((product) => {
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      const matchesCategory = categories.length === 0 || categories.includes(product.category);
      return matchesTerm && matchesCategory;
    });

    const items = filtered.slice(cursor, cursor + pageSize);
    const next = cursor + pageSize;

    return { items, nextCursor: next < filtered.length ? next : null, total: filtered.length };
  },

  async getProduct(id: string): Promise<Product> {
    await delay(300);
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) throw new Error(`Product ${id} not found`);
    return product;
  },

  async listOrders(status?: string): Promise<Order[]> {
    await delay(LATENCY_MS);
    return status && status !== 'all' ? ORDERS.filter((order) => order.status === status) : ORDERS;
  },

  async cancelOrder(id: string): Promise<void> {
    await delay(400);
    const index = ORDERS.findIndex((order) => order.id === id);
    if (index >= 0) ORDERS.splice(index, 1);
  },

  async submitCheckout(values: Record<string, unknown>): Promise<{ reference: string }> {
    await delay(900);
    if (String(values.otp ?? '').length && String(values.otp) !== '123456') {
      throw new Error('That code was not correct. Try 123456.');
    }
    return { reference: `ORD-${Math.floor(10000 + Math.random() * 89999)}` };
  },

  /** Pretends to fetch a server-driven screen. Fails every 4th call so the
   *  bundled fallback path gets exercised. */
  async fetchScreenSchema(screenId: string): Promise<unknown> {
    await delay(400);
    if (productCallCount % 4 === 3) throw new Error('Schema service unavailable');
    return { screenId, version: 3, components: [] };
  },
};
