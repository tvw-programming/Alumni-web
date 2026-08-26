import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { logError } from '@/utils/errorLogger';
import { normalizeError, getUserMessage } from '@/utils/errors';

import { ErrorTechnicalDetails } from './ErrorTechnicalDetails';

/** A stale deploy is the usual cause; a reload fetches the current manifest. */
function isChunkLoadError(message: string): boolean {
  return /failed to fetch dynamically imported module|loading chunk|importing a module script failed/i.test(
    message,
  );
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Memoized so the effect below can depend on it honestly: it is a pure
  // function of `error`, so the dependency list stays [error, appError] and
  // still fires once per caught error rather than once per render.
  const appError = useMemo(() => normalizeError(error), [error]);
  const chunk = isChunkLoadError(appError.message);

  // `normalizeError`/`getUserMessage` decide what the user sees; this is the
  // persistence side — every render-time crash the boundary catches also lands
  // in the durable log (localStorage, plus whatever sink monitoring installs)
  // so it shows up in AdminErrorLog without a screen-sharing session.
  useEffect(() => {
    const err = error instanceof Error ? error : undefined;
    logError({
      channel: 'app',
      level: 'error',
      // A render crash leaves the user with no working screen, so it outranks
      // an ordinary error even when its kind looks mundane.
      severity: 'fatal',
      fileName: 'AppErrorBoundary.tsx',
      error:
        appError.kind === 'unknown' && err?.name
          ? err.name
          : `BOUNDARY_${appError.kind.toUpperCase()}`,
      errorDescription: appError.message,
      context: {
        kind: 'boundary',
        componentStack: err?.stack?.split('\n').slice(0, 5).join(' | '),
      },
    });
    // Logs once per caught error instance, not on every re-render triggered by
    // `resetErrorBoundary` re-throwing the same object.
  }, [error, appError]);

  return (
    <Paper variant="outlined" sx={{ p: 4, m: 2 }}>
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="h6">Something went wrong</Typography>
        <Typography color="text.secondary">
          {chunk
            ? 'The app was updated while this page was open. Reload to get the latest version.'
            : getUserMessage(appError)}
        </Typography>

        {chunk && (
          <Alert severity="info" variant="outlined" sx={{ width: '100%' }}>
            This screen could not load part of its code. Reloading almost always fixes it.
          </Alert>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={resetErrorBoundary}>
            Try again
          </Button>
          {chunk && (
            <Button
              variant="outlined"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload page
            </Button>
          )}
          <Button variant="outlined" startIcon={<HomeIcon />} href="/">
            Back to home
          </Button>
        </Stack>

        <ErrorTechnicalDetails error={error} appError={appError} source="AppErrorBoundary" />
      </Stack>
    </Paper>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

/** Catches render-time errors; API/route errors are handled elsewhere. */
export function AppErrorBoundary({ children, onReset }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}
