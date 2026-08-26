import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { snackbar } from '@/components/snackbar/snackbarBus';
import { useSnackbar } from '@/components/snackbar/SnackbarProvider';

/** Demonstrates programmatic triggering from outside any component. */
function simulateBackgroundJob(): void {
  window.setTimeout(() => {
    snackbar.success('Background job finished', {
      action: { label: 'View log', onClick: () => snackbar.info('Log opened') },
    });
  }, 1500);
}

export function SnackbarDemoPage() {
  const toast = useSnackbar();

  return (
    <Paper sx={{ p: 4, maxWidth: 640 }}>
      <Typography variant="h5" gutterBottom>
        Snackbar system
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Variants, action buttons, dismiss control, auto-hide, anchor position, and programmatic
        triggering from plain TypeScript modules.
      </Typography>
      <Stack spacing={1.5} alignItems="flex-start">
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button variant="contained" color="success" onClick={() => toast.success('Saved!')}>
            Success
          </Button>
          <Button variant="contained" color="info" onClick={() => toast.info('Heads up')}>
            Info
          </Button>
          <Button variant="contained" color="warning" onClick={() => toast.warning('Careful…')}>
            Warning
          </Button>
          <Button variant="contained" color="error" onClick={() => toast.error('It broke')}>
            Error
          </Button>
        </Stack>
        <Button
          variant="outlined"
          onClick={() =>
            toast.warning('Item deleted', {
              action: { label: 'Undo', onClick: () => toast.success('Item restored') },
            })
          }
        >
          With action button (Undo)
        </Button>
        <Button
          variant="outlined"
          onClick={() => toast.error('Persistent until dismissed', { autoHideDuration: null })}
        >
          Persistent (no auto-hide)
        </Button>
        <Button
          variant="outlined"
          onClick={() =>
            toast.info('Anchored top-center', {
              anchorOrigin: { vertical: 'top', horizontal: 'center' },
              autoHideDuration: 3000,
            })
          }
        >
          Top-center anchor
        </Button>
        <Button
          variant="outlined"
          onClick={() =>
            toast.info('Not dismissible, hides in 2s', {
              dismissible: false,
              autoHideDuration: 2000,
            })
          }
        >
          No dismiss button
        </Button>
        <Button variant="outlined" onClick={simulateBackgroundJob}>
          Programmatic (fires in 1.5s from a service)
        </Button>
      </Stack>
    </Paper>
  );
}
