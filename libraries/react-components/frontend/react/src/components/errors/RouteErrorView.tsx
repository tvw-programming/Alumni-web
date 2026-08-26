import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo } from 'react';
import {
  isRouteErrorResponse,
  Link as RouterLink,
  useNavigate,
  useRouteError,
} from 'react-router-dom';

import { logError, logWarning } from '@/utils/errorLogger';
import { normalizeError, getUserMessage } from '@/utils/errors';

import { ErrorTechnicalDetails } from './ErrorTechnicalDetails';

/** Centralized route-level error UI, attached via errorElement. */
export function RouteErrorView() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Memoized so the effect below can list what it reads: all of these are a
  // pure function of `error`, so the effect still fires once per error rather
  // than once per render.
  const { title, detail, is404, appError } = useMemo(() => {
    const normalized = normalizeError(error);
    if (isRouteErrorResponse(error)) {
      const notFound = error.status === 404;
      return {
        title: `${String(error.status)} ${error.statusText}`,
        detail: notFound
          ? 'This page does not exist.'
          : 'Something went wrong while loading this page.',
        is404: notFound,
        appError: normalized,
      };
    }
    return {
      title: 'Unexpected error',
      detail: getUserMessage(normalized),
      is404: false,
      appError: normalized,
    };
  }, [error]);

  // A 404 is expected navigation noise, not a system fault — log it at
  // `warning`. Anything else (a lazy-route import failure, a thrown loader, an
  // unhandled render error) is an `error`-level entry so it stands out.
  useEffect(() => {
    const entry = {
      channel: 'app' as const,
      fileName: 'RouteErrorView.tsx',
      error: isRouteErrorResponse(error) ? `ROUTE_${String(error.status)}` : 'ROUTE_ERROR',
      errorDescription: detail,
      status: isRouteErrorResponse(error) ? error.status : null,
      context: { kind: 'route', path: window.location.pathname },
    };
    if (is404) {
      logWarning(entry);
    } else {
      logError({ ...entry, level: 'error' });
    }
  }, [error, detail, is404]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" px={2}>
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 720, width: '100%' }}>
        <Typography variant="h4">{title}</Typography>
        <Typography color="text.secondary" textAlign="center">
          {detail}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
          {/* A route error is often transient (a failed loader, a dropped
              connection); re-running the current entry is the cheapest fix
              before sending the user back to the start. */}
          {!is404 && (
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => void navigate(0)}
            >
              Try again
            </Button>
          )}
          <Button
            component={RouterLink}
            to="/"
            variant={is404 ? 'contained' : 'outlined'}
            startIcon={<HomeIcon />}
          >
            Back to home
          </Button>
        </Stack>

        <ErrorTechnicalDetails error={error} appError={appError} source="RouteErrorView" />
      </Stack>
    </Box>
  );
}
