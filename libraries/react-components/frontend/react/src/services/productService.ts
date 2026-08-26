import { get, post, put } from '@/api/request';

import type { NewProduct, Product, ProductListFilters, ProductListResponse } from '@/types/product';

export async function fetchProducts(
  filters: ProductListFilters,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  const trimmed = filters.search.trim();
  const url = trimmed ? '/products/search' : '/products';
  return get<ProductListResponse>(url, {
    params: {
      q: trimmed || undefined,
      limit: filters.pageSize,
      skip: filters.page * filters.pageSize,
    },
    signal,
  });
}

export async function createProduct(input: NewProduct): Promise<Product> {
  return post<Product, NewProduct>('/products/add', input);
}

/** Fields the inline-edit grid is allowed to patch. */
export type ProductUpdate = Partial<
  Pick<Product, 'title' | 'category' | 'stock' | 'price' | 'rating'>
>;

/**
 * Persist a single-field (or partial) product edit. Returns the server's view
 * of the row, which the inline-edit grid uses to refresh the cell or the row.
 * DummyJSON echoes the merged product back from PUT /products/:id.
 */
export async function updateProduct(id: number, changes: ProductUpdate): Promise<Product> {
  return put<Product, ProductUpdate>(`/products/${id}`, changes);
}
