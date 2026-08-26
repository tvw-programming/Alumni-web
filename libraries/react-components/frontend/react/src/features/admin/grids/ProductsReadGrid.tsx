import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ChangeEvent } from 'react';

import { AppDataGrid, type GridSelectionMode } from '@/components/grid/AppDataGrid';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useProducts } from '@/hooks/useProducts';
import { capitalize, currencyFormatter } from '@/utils/format';

import type { Product } from '@/types/product';
import type { ColDef, GridApi } from 'ag-grid-community';

const GRID_FILTERS = { search: '', page: 0, pageSize: 100 } as const;

/** Stable identity so prepend transactions (applyTransaction) touch one row. */
function getProductRowId(product: Product): string {
  return String(product.id);
}

interface ProductsReadGridProps {
  onGridReady?: (api: GridApi<Product>) => void;
}

/**
 * Read-only (+ selection) products grid, extracted from AdminProductsPage so it
 * can be embedded in the Manage Product page's 80% band unchanged. Row creation
 * is driven by the host page via `onGridReady` → applyTransaction.
 */
export function ProductsReadGrid({ onGridReady }: ProductsReadGridProps) {
  const [pagination, setPagination] = useState(true);
  const [checkboxes, setCheckboxes] = useState(true);
  const [filterable, setFilterable] = useState(true);
  const [quickFilter, setQuickFilter] = useState('');
  const selectionMode: GridSelectionMode = checkboxes ? 'multiple' : 'single';

  const productsQuery = useProducts(GRID_FILTERS);

  const columnDefs = useMemo<ColDef<Product>[]>(
    () => [
      { field: 'id', headerName: 'ID', pinned: 'left', maxWidth: 90, flex: 0 },
      { field: 'title', headerName: 'Title', minWidth: 200 },
      {
        field: 'category',
        headerName: 'Category',
        valueFormatter: ({ value }) => (typeof value === 'string' ? capitalize(value) : ''),
      },
      {
        field: 'price',
        headerName: 'Price',
        filter: 'agNumberColumnFilter',
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? currencyFormatter.format(value) : '',
      },
      { field: 'stock', headerName: 'Stock', filter: 'agNumberColumnFilter' },
    ],
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap mb={2}>
        <Typography variant="subtitle1" fontWeight={600} flexGrow={1}>
          Products
        </Typography>
        <FormControlLabel
          control={<Switch checked={pagination} onChange={(_e, v) => setPagination(v)} />}
          label="Pagination"
        />
        <FormControlLabel
          control={<Switch checked={checkboxes} onChange={(_e, v) => setCheckboxes(v)} />}
          label="Checkboxes"
        />
        <FormControlLabel
          control={<Switch checked={filterable} onChange={(_e, v) => setFilterable(v)} />}
          label="Filters"
        />
        <TextField
          label="Quick filter"
          size="small"
          value={quickFilter}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setQuickFilter(event.target.value)}
        />
      </Stack>
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <AppDataGrid<Product>
          rowData={productsQuery.data?.products}
          columnDefs={columnDefs}
          loading={productsQuery.isPending}
          height="100%"
          pagination={pagination}
          paginationPageSize={10}
          selectionMode={selectionMode}
          checkboxSelection={checkboxes}
          filterable={filterable}
          quickFilterText={quickFilter}
          getRowId={getProductRowId}
          noRowsMessage="No products yet"
          onGridReady={onGridReady}
          onSelectionChanged={(rows) =>
            rows.length > 0 ? snackbar.info(`${rows.length} row(s) selected`) : undefined
          }
        />
      </Box>
    </Box>
  );
}
