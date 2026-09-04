import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import IconButton from '@mui/material/IconButton';
import Rating from '@mui/material/Rating';
import Tooltip from '@mui/material/Tooltip';

import type { ICellRendererParams } from 'ag-grid-community';

/**
 * Read view for a star-rating column: read-only MUI Rating (half-star
 * precision) + the numeric value, with the same right-edge pencil edit
 * trigger as PencilEditCellRenderer.
 */
export function StarRatingCellRenderer<TData>(params: ICellRendererParams<TData, number>) {
  const value = typeof params.value === 'number' ? params.value : null;

  const startEditing = () => {
    const { rowIndex } = params.node;
    if (rowIndex === null || params.column === null || params.column === undefined) return;
    params.api.startEditingCell({ rowIndex, colKey: params.column.getColId() });
  };

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        gap: 6,
      }}
    >
      <Rating size="small" precision={0.5} max={5} value={value} readOnly />
      <span
        style={{ flex: 1, minWidth: 0, overflow: 'hidden', fontVariantNumeric: 'tabular-nums' }}
      >
        {value === null ? '' : value.toFixed(1)}
      </span>
      <Tooltip title="Edit">
        <IconButton
          size="small"
          aria-label={`Edit ${params.column?.getColDef().headerName ?? 'rating'}`}
          onClick={startEditing}
          sx={{
            p: 0.25,
            flexShrink: 0,
            opacity: 0,
            transition: 'opacity 120ms',
            '.ag-row-hover &, &:focus-visible': { opacity: 1 },
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Tooltip>
    </span>
  );
}
