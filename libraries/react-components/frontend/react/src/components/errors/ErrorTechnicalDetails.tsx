import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { getRelease, getSessionId } from '@/utils/monitoring';

import type { AppError } from '@/types/api';

interface ErrorTechnicalDetailsProps {
  error: unknown;
  appError: AppError;
  source: string;
}

/**
 * Developer-facing detail, rendered only in dev builds.
 *
 * Production users get the friendly message and the recovery actions; stack
 * traces, error kinds and internal identifiers stay out of the shipped UI. The
 * same information is always in the durable log, which is where support should
 * read it from.
 */
export function ErrorTechnicalDetails({ error, appError, source }: ErrorTechnicalDetailsProps) {
  if (!import.meta.env.DEV) return null;

  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <Accordion variant="outlined" sx={{ width: '100%' }} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" color="text.secondary">
          Technical details (dev only)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            fontSize: 12,
            lineHeight: 1.6,
            bgcolor: 'action.hover',
            borderRadius: 1,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {[
            `source   : ${source}`,
            `kind     : ${appError.kind}`,
            `message  : ${appError.message}`,
            'status' in appError ? `status   : ${String(appError.status)}` : null,
            `release  : ${getRelease()}`,
            `session  : ${getSessionId()}`,
            stack ? `\n${stack}` : null,
          ]
            .filter((line): line is string => line !== null)
            .join('\n')}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
