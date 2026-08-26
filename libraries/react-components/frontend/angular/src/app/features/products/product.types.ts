/** Mirrors the API's product payload (`api/internal/model/product.go`). */
export interface Product {
  id: number;
  productId: string;
  productName: string;
  description: string;
  /** Sent as a string: the API stores NUMERIC, and a JS number would lose cents. */
  price: string;
  rating: number;
  productImagePath: string | null;
  productDocumentPaths: string[];
  comments: string | null;
  releaseDate: string;
  supportEmail: string | null;
  supportPhone: string | null;
  productUrl: string | null;
  themeColor: string | null;
  condition: string;
  availability: string;
  tags: string[];
  shippingRegions: string[];
  warrantyMonths: number;
  isPublished: boolean;
  acceptTerms: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

/** The API's paged envelope. `total` is null when the count was skipped. */
export interface ProductPage {
  items: Product[];
  total: number | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ProductListParams {
  page: number;
  pageSize: number;
  search: string;
  category: string;
  sortBy: string;
  sortDesc: boolean;
  withTotal: boolean;
}
