import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { memo, useState, type MouseEvent } from 'react';

import { simulateApiCall } from './simulateApi';

import type { CustomCellRendererProps } from 'ag-grid-react';

interface RefreshRow {
  firstName: string;
  lastName: string;
  email?: string;
}

/**
 * Refresh cell renderer: calls an API endpoint for the row, then applies the
 * returned data (e.g. an updated email) through a single-row transaction —
 * no full-table re-render, scroll position untouched.
 * Requires `getRowId` on the grid.
 */
export const RefreshRowRenderer = memo(function RefreshRowRenderer(
  props: CustomCellRendererProps<RefreshRow>,
) {
  const [loading, setLoading] = useState(false);

  if (!props.data) return null;

  const handleClick = async (event: MouseEvent) => {
    event.stopPropagation();
    if (!props.data) return;
    setLoading(true);
    try {
      // Dummy endpoint response: server returns the row with a fresh email.
      const updated = await simulateApiCall({
        ...props.data,
        email: `${props.data.firstName}.${props.data.lastName}@refreshed.example.com`.toLowerCase(),
      });
      props.api.applyTransaction({ update: [updated] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="small"
      variant="outlined"
      disabled={loading}
      onClick={handleClick}
      startIcon={
        loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon fontSize="small" />
      }
      sx={{ textTransform: 'none' }}
    >
      {loading ? 'Refreshing…' : 'Refresh'}
    </Button>
  );
});
