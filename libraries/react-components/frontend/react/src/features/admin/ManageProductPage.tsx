import { useCallback, useRef } from 'react';

import { FormGridSplit } from '@/components/layout/FormGridSplit';

import { ProductsReadGrid } from './grids/ProductsReadGrid';
import { ProductQuickAddForm } from './ProductQuickAddForm';

import type { Product } from '@/types/product';
import type { GridApi } from 'ag-grid-community';

/** Manage Product: 20% quick-add form + 80% read-only products grid. */
export function ManageProductPage() {
  const apiRef = useRef<GridApi<Product> | null>(null);

  const handleCreated = useCallback((product: Product) => {
    apiRef.current?.applyTransaction({ add: [product], addIndex: 0 });
  }, []);

  return (
    <FormGridSplit
      form={<ProductQuickAddForm onCreated={handleCreated} />}
      grid={
        <ProductsReadGrid
          onGridReady={(api) => {
            apiRef.current = api;
          }}
        />
      }
    />
  );
}
