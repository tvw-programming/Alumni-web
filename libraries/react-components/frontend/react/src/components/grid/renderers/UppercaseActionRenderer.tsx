import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { memo, useState, type MouseEvent } from 'react';

import { simulateApiCall } from './simulateApi';

import type { CustomCellRendererProps } from 'ag-grid-react';

interface ActionRow {
  firstName: string;
  gender?: string;
}

/**
 * Button cell renderer. Colors depend on row data (blue = male, pink = female).
 * Click: dummy API call, then a transactional single-row update — AG Grid
 * re-renders only this row and preserves scroll position.
 * Requires `getRowId` on the grid.
 */
export const UppercaseActionRenderer = memo(function UppercaseActionRenderer(
  props: CustomCellRendererProps<ActionRow>,
) {
  const [saving, setSaving] = useState(false);

  if (!props.data) return null;
  const isMale = props.data.gender?.toLowerCase() === 'male';

  const handleClick = async (event: MouseEvent) => {
    event.stopPropagation(); // don't trigger row selection/click
    if (!props.data) return;
    setSaving(true);
    try {
      const updated = await simulateApiCall({
        ...props.data,
        firstName: props.data.firstName.toUpperCase(),
      });
      props.api.applyTransaction({ update: [updated] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      size="small"
      variant="contained"
      disableElevation
      disabled={saving}
      onClick={handleClick}
      startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
      sx={{
        textTransform: 'none',
        bgcolor: isMale ? 'primary.main' : '#d81b60',
        '&:hover': { bgcolor: isMale ? 'primary.dark' : '#ad1457' },
      }}
    >
      Uppercase
    </Button>
  );
});
