import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import type { ICellRendererParams } from 'ag-grid-community';

/**
 * Cell renderer for inline-editable columns: formatted value on the left, a
 * pencil icon pinned to the right edge of the cell. The pencil is the edit
 * trigger — clicking it calls `api.startEditingCell` for this cell. It stays
 * invisible until the row is hovered (or the button is keyboard-focused) so
 * the grid keeps a clean read view.
 */
export function PencilEditCellRenderer<TData>(params: ICellRendererParams<TData>) {
  const display =
    params.valueFormatted ??
    (params.value === null || params.value === undefined ? '' : String(params.value));

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
        gap: 4,
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {display}
      </span>
      <Tooltip title="Edit">
        <IconButton
          size="small"
          aria-label={`Edit ${params.column?.getColDef().headerName ?? 'cell'}`}
          onClick={startEditing}
          sx={{
            p: 0.25,
            flexShrink: 0,
            opacity: 0,
            transition: 'opacity 120ms',
            // Reveal on row hover or keyboard focus.
            '.ag-row-hover &, &:focus-visible': { opacity: 1 },
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Tooltip>
    </span>
  );
}
