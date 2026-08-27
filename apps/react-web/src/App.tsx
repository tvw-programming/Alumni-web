/**
 * App shell: three screens, one nav, and the fixture banner.
 *
 * The banner is deliberately loud. A reviewer looking at a grid full of
 * plausible names has no way to tell whether they are seeing the database or a
 * fixture file, and quietly showing fake data is how a demo gets mistaken for a
 * working integration.
 */
import { Alert, AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { useState } from 'react';

import AlumniAdminGrid from '~/features/admin/AlumniAdminGrid';
import ProfilePage from '~/features/alumni/ProfilePage';
import GalleryPage from '~/features/media/GalleryPage';
import { USING_FIXTURES } from '~/api/alumni';

const SCREENS = [
  { label: 'Admin', render: () => <AlumniAdminGrid /> },
  { label: 'Profile', render: () => <ProfilePage /> },
  { label: 'Gallery', render: () => <GalleryPage /> },
] as const;

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <SchoolIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-.01em' }}>
            Alumni Network
          </Typography>
          <Tabs value={tab} onChange={(_, next: number) => setTab(next)} sx={{ ml: 3 }}>
            {SCREENS.map((screen) => (
              <Tab key={screen.label} label={screen.label} />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {USING_FIXTURES && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Fixture data — the Go gateway is not connected. Set{' '}
            <code>VITE_USE_FIXTURES=false</code> to talk to a real API.
          </Alert>
        )}
        {SCREENS[tab].render()}
      </Container>
    </Box>
  );
}
