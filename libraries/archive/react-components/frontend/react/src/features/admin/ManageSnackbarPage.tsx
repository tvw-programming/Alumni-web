import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { SnackbarDemoPage } from '@/features/demo/SnackbarDemoPage';

/** Manage Snackbar: hosts the existing snackbar demo. */
export function ManageSnackbarPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Manage Snackbar</Typography>
      <SnackbarDemoPage />
    </Stack>
  );
}
