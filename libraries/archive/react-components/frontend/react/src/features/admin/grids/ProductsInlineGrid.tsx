import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState, type ChangeEvent } from 'react';

import { AppDataGrid } from '@/components/grid/AppDataGrid';
import { buildEditableColDefs } from '@/components/grid/editing/buildEditableColDefs';
import { StarRatingCellRenderer } from '@/components/grid/editing/StarRatingCellRenderer';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useProducts } from '@/hooks/useProducts';
import { updateProduct } from '@/services/productService';
import { PRODUCT_CATEGORIES, type Product } from '@/types/product';
import { capitalize, currencyFormatter } from '@/utils/format';

import type { EditableColumnDef, SaveHandler } from '@/components/grid/editing/editingTypes';
import type { GridApi, ICellRendererParams } from 'ag-grid-community';

/** Custom cell renderer: colored rating chip. */
function RatingCellRenderer(props: ICellRendererParams<Product, number>) {
  if (typeof props.value !== 'number') return null;
  const color = props.value >= 4.5 ? 'success' : props.value >= 3.5 ? 'warning' : 'error';
  return <Chip label={props.value.toFixed(2)} color={color} size="small" />;
}

const GRID_FILTERS = { search: '', page: 0, pageSize: 100 } as const;

function getProductRowId(product: Product): string {
  return String(product.id);
}

const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((category) => ({
  label: capitalize(category),
  value: category,
}));

/** Column metadata IS the editing config (title/category/stock editable). */
const EDITABLE_COLUMNS: EditableColumnDef<Product>[] = [
  { field: 'id', headerName: 'ID', pinned: 'left', maxWidth: 90, flex: 0 },
  {
    field: 'title',
    headerName: 'Title',
    minWidth: 220,
    inlineEditable: true,
    editorType: 'text',
    validation: { required: true, minLength: 3, maxLength: 80 },
    refreshMode: 'cell',
  },
  {
    field: 'category',
    headerName: 'Category',
    valueFormatter: ({ value }) => (typeof value === 'string' ? capitalize(value) : ''),
    inlineEditable: true,
    editorType: 'dropdown',
    editorOptions: CATEGORY_OPTIONS,
    refreshMode: 'row',
  },
  {
    field: 'price',
    headerName: 'Price',
    filter: 'agNumberColumnFilter',
    valueFormatter: ({ value }) =>
      typeof value === 'number' ? currencyFormatter.format(value) : '',
  },
  {
    field: 'rating',
    headerName: 'Rating',
    cellRenderer: RatingCellRenderer,
    filter: 'agNumberColumnFilter',
  },
  {
    // Second view of `rating`: editable star-rating component. The unique
    // colId keeps AG Grid happy; saves persist against the `rating` field.
    colId: 'ratingStars',
    field: 'rating',
    headerName: 'Star Rating',
    minWidth: 170,
    filter: 'agNumberColumnFilter',
    cellRenderer: StarRatingCellRenderer,
    inlineEditable: true,
    editorType: 'rating',
    validation: { required: true, min: 0, max: 5 },
    refreshMode: 'cell',
  },
  {
    field: 'stock',
    headerName: 'Stock',
    filter: 'agNumberColumnFilter',
    inlineEditable: true,
    editorType: 'number',
    validation: { required: true, min: 0, max: 99999 },
    refreshMode: 'cell',
  },
];

interface ProductsInlineGridProps {
  onGridReady?: (api: GridApi<Product>) => void;
}

/**
 * Config-driven inline-edit products grid, extracted from ProductsGridPage for
 * embedding in the Manage Product (inline edit) page. Grid config is unchanged.
 */
export function ProductsInlineGrid({ onGridReady }: ProductsInlineGridProps) {
  const [quickFilter, setQuickFilter] = useState('');
  const [editingEnabled, setEditingEnabled] = useState(true);
  const [optimistic, setOptimistic] = useState(false);

  const productsQuery = useProducts(GRID_FILTERS);

  const saveHandler = useCallback<SaveHandler<Product>>(async (context) => {
    const updated = await updateProduct(context.data.id, {
      [context.field]: context.newValue,
    });
    snackbar.success(`${capitalize(context.field)} saved`);
    return updated;
  }, []);

  const columnDefs = useMemo(
    () =>
      buildEditableColDefs(EDITABLE_COLUMNS, {
        inlineEditable: editingEnabled,
        saveHandler,
        updateStrategy: optimistic ? 'optimistic' : 'pessimistic',
      }),
    [editingEnabled, optimistic, saveHandler],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap mb={2}>
        <Typography variant="subtitle1" fontWeight={600} flexGrow={1}>
          Products — inline editing
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={editingEnabled}
              onChange={(event) => setEditingEnabled(event.target.checked)}
            />
          }
          label="Inline editing"
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={optimistic}
              onChange={(event) => setOptimistic(event.target.checked)}
            />
          }
          label="Optimistic saves"
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
          pagination
          paginationPageSize={10}
          selectionMode="multiple"
          checkboxSelection
          quickFilterText={quickFilter}
          noRowsMessage="No products found"
          getRowId={getProductRowId}
          // Editing starts ONLY from the pencil icon in each editable cell —
          // single/double click editing is suppressed.
          gridOptions={{ suppressClickEdit: true }}
          onGridReady={onGridReady}
        />
      </Box>
    </Box>
  );
}
