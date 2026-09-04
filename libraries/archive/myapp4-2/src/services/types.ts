/** Domain types. Deliberately separate from anything in `src/components`. */

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'failed' | 'refunded';

export interface Product {
  id: string;
  name: string;
  category: string;
  /** Minor units. Always. */
  priceMinor: number;
  currency: string;
  rating: number;
  ratingCount: number;
  inStock: boolean;
  description: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  priceMinor: number;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  totalMinor: number;
  currency: string;
  placedAt: string;
  items: OrderItem[];
}

export interface Page<T> {
  items: T[];
  nextCursor: number | null;
  total: number;
}

export interface ProductQuery {
  search?: string;
  categories?: string[];
  cursor?: number;
  pageSize?: number;
}
