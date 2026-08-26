import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

import type { ReactNode } from 'react';

interface FormGridSplitProps {
  /** Compact create/quick-add form — rendered in the left ~20% column. */
  form: ReactNode;
  /** Data grid — rendered in the right ~80% column. */
  grid: ReactNode;
}

/**
 * Reusable Manage-page layout: a two-column 12/88 split of the available
 * width. The form column (single-column fields) keeps a sensible minWidth so
 * fields never crush and scrolls internally if it overflows; the grid column
 * fills the rest. Stacks vertically below the md breakpoint.
 */
export function FormGridSplit({ form, grid }: FormGridSplitProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'stretch',
        flexGrow: 1,
        minHeight: 0,
        gap: 2,
      }}
    >
      <Paper
        sx={{
          flex: { xs: '0 0 auto', md: '0 0 12%' },
          minWidth: { md: 160 },
          minHeight: 0,
          overflow: 'auto',
          p: 2,
        }}
      >
        {form}
      </Paper>
      <Paper
        sx={{
          flex: '1 1 88%',
          minWidth: 0,
          // Fallback height so the grid never collapses even if an ancestor
          // doesn't provide a bounded height.
          minHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
        }}
      >
        {grid}
      </Paper>
    </Box>
  );
}
