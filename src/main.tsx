/**
 * Entry point.
 *
 * QueryClient defaults are set here rather than per-hook: retry-once because a
 * failed fetch on a flaky connection usually succeeds immediately, and
 * refetchOnWindowFocus off because an admin tabbing back to a grid they were
 * mid-edit in does not want it replaced underneath them.
 */
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '~/App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const theme = createTheme({
  palette: { primary: { main: '#2F4B7C' } },
  shape: { borderRadius: 6 },
  typography: { fontFamily: '"IBM Plex Sans", system-ui, sans-serif' },
});

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
