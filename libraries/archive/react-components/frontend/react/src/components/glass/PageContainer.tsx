import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { ReactNode } from 'react';

interface PageContainerProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Shared page header primitive, ported from the CodeGen project. Unlike the
 * original it renders no MUI Container — the PublicLayout shell already wraps
 * pages in one — so it only provides the consistent title/subtitle/action
 * header used by Home, About and Team.
 */
export function PageContainer({ title, subtitle, action, children }: PageContainerProps) {
  return (
    <Box>
      {(title !== undefined || action !== undefined) && (
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            {title !== undefined && (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            )}
            {subtitle !== undefined && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}
