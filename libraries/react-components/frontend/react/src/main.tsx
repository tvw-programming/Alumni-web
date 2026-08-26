import { QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

import { queryClient } from '@/api/queryClient';
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';
import { SnackbarProvider } from '@/components/snackbar/SnackbarProvider';
import { RouterWithBreadcrumbs } from '@/routes/RouterWithBreadcrumbs';
import { SpeechProvider } from '@/speech/SpeechProvider';
import { AuthProvider } from '@/store/authContext';
import { AppThemeProvider } from '@/theme';
import { installGlobalErrorHandlers } from '@/utils/globalErrorHandlers';

// Lazy-load devtools — only in development, never in production bundle.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null;

// Installed before rendering so a crash during the first paint is still
// captured. Console mirroring is dev-only: in production it would log the
// browser's own noise (extensions, blocked resources) as app errors.
installGlobalErrorHandlers({ captureConsoleErrors: import.meta.env.DEV });

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <Suspense fallback={null}>
    <AppThemeProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SnackbarProvider>
              <SpeechProvider>
                <RouterWithBreadcrumbs />
              </SpeechProvider>
            </SnackbarProvider>
          </AuthProvider>
          {ReactQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
      </AppErrorBoundary>
    </AppThemeProvider>
  </Suspense>,
);
