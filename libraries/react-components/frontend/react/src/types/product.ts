export interface Product {
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

export interface ProductListResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProductListFilters {
  search: string;
  page: number;
  pageSize: number;
}

export interface NewProduct {
  title: string;
  price: number;
  stock: number;
  category: string;
  description: string;
}

export const PRODUCT_CATEGORIES = [
  'beauty',
  'fragrances',
  'furniture',
  'groceries',
  'laptops',
  'smartphones',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
