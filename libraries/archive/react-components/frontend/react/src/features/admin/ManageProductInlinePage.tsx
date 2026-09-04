import { useCallback, useRef } from 'react';

import { FormGridSplit } from '@/components/layout/FormGridSplit';

import { ProductsInlineGrid } from './grids/ProductsInlineGrid';
import { ProductQuickAddForm } from './ProductQuickAddForm';

import type { Product } from '@/types/product';
import type { GridApi } from 'ag-grid-community';

/** Manage Product (inline edit): 20% quick-add form + 80% inline-edit grid. */
export function ManageProductInlinePage() {
  const apiRef = useRef<GridApi<Product> | null>(null);

  const handleCreated = useCallback((product: Product) => {
    apiRef.current?.applyTransaction({ add: [product], addIndex: 0 });
  }, []);

  return (
    <FormGridSplit
      form={<ProductQuickAddForm onCreated={handleCreated} />}
      grid={
        <ProductsInlineGrid
          onGridReady={(api) => {
            apiRef.current = api;
          }}
        />
      }
    />
  );
}
