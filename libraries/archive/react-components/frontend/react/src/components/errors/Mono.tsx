import Box from '@mui/material/Box';

import type { ReactNode } from 'react';

/**
 * Monospace, non-wrapping cell content. Every machine-generated value in the
 * log tables (endpoints, codes, durations, file paths) renders through this so
 * the columns stay scannable and aligned.
 */
export function Mono({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}
