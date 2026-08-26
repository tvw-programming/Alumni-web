import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import DashboardPage from './pages/DashboardPage';
import { useRun } from './hooks/useRun';

// The documentation view carries the markdown renderer and the tree view.
// Loading it on demand keeps those out of the dashboard's first paint.
const DocsPage = lazy(() => import('./pages/DocsPage'));

function RouteFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={26} />
    </Box>
  );
}

export default function App() {
  const controller = useRun();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar
        secondsUntilRefresh={controller.secondsUntilRefresh}
        loading={controller.loading}
        autoRefresh={controller.autoRefresh}
        onToggleAuto={() => controller.setAutoRefresh(!controller.autoRefresh)}
        onRefreshNow={() => void controller.refresh()}
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<DashboardPage controller={controller} />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Box>
  );
}
