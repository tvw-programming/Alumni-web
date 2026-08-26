import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ThemeSettingsPanel } from '@/theme';

/** Manage Theme: hosts the shared ThemeSettingsPanel. */
export function ManageThemePage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Manage Theme</Typography>
      <Card sx={{ maxWidth: 420 }}>
        <ThemeSettingsPanel />
      </Card>
    </Stack>
  );
}
