import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import { getUserMessage } from '@/utils/errors';

import type { AppError } from '@/types/api';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

interface QueryGateProps<TData> {
  query: UseQueryResult<TData, AppError>;
  /** Report "empty" for a successful response with no content. */
  isEmpty?: (data: TData) => boolean;
  loadingFallback?: ReactNode;
  emptyFallback?: ReactNode;
  children: (data: TData) => ReactNode;
}

/**
 * Renders loading / error / empty / success states explicitly so pages never
 * touch `data` before it exists.
 */
export function QueryGate<TData>({
  query,
  isEmpty,
  loadingFallback,
  emptyFallback,
  children,
}: QueryGateProps<TData>) {
  if (query.status === 'pending') {
    return (
      loadingFallback ?? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )
    );
  }

  if (query.status === 'error') {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void query.refetch()}>
            Retry
          </Button>
        }
      >
        {getUserMessage(query.error)}
      </Alert>
    );
  }

  if (isEmpty?.(query.data) === true) {
    return (
      emptyFallback ?? (
        <Box py={6} textAlign="center">
          <Typography color="text.secondary">Nothing to show yet.</Typography>
        </Box>
      )
    );
  }

  return <>{children(query.data)}</>;
}
