/**
 * The dummyjson.com product shape.
 *
 * Distinct from `product.types.ts`, which is *our* API's product. The demo
 * pages (read-only grid, the 13 API scenarios) exercise a third-party API on
 * purpose — showing what the request layer does against something we do not
 * control — so their type stays separate rather than being bent to match ours.
 */
export interface DemoProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
  brand?: string;
  thumbnail?: string;
}

export interface DemoProductListResponse {
  products: DemoProduct[];
  total: number;
  skip: number;
  limit: number;
}

export interface DemoProductListFilters {
  page: number;
  pageSize: number;
  search: string;
}
