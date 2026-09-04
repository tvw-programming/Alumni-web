import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { DOCUMENTATION_NAV, documentationPath } from '@/routes/navigation';
import { navCommandsFor } from '@/speech/useNavigationCommands';
import { useSpeechCommands } from '@/speech/useSpeechCommands';

const DRAWER_WIDTH = 232;

/**
 * The Documentation shell.
 *
 * A sibling of `MasterDataLayout`, not a variant of it: the two sections have
 * different sidebars and different content, and sharing a layout would mean a
 * prop deciding which nav array to read — which is the point at which a shared
 * component stops paying for itself.
 *
 * Deliberately **no ordinal gutter**. Only one list in the app may answer to
 * "second menu" (see `speech/ordinals.ts`); Master Data owns that, so this
 * sidebar registers named commands only.
 */
function SidebarList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <List component="nav" aria-label="Documentation sections">
      {DOCUMENTATION_NAV.map((item) => (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          onClick={onNavigate}
          sx={{ '&.active': { bgcolor: 'action.selected' } }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
        </ListItemButton>
      ))}
    </List>
  );
}

export function DocumentationLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Named voice commands for this sidebar, built from the same array it renders
  // so a link and its command cannot drift apart.
  const commands = useMemo(
    () =>
      navCommandsFor(DOCUMENTATION_NAV, 'Documentation', documentationPath, (path) => {
        void navigate(path);
      }),
    [navigate],
  );
  useSpeechCommands(commands);

  return (
    <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="overline" sx={{ px: 2, pt: 2, display: 'block' }}>
            Documentation
          </Typography>
          <SidebarList />
        </Box>
      ) : (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{ paper: { sx: { width: DRAWER_WIDTH } } }}
        >
          <Toolbar />
          <SidebarList onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      {/*
        Scrollable content area, as in `MasterDataLayout`. The admin shell pins
        itself to the viewport with `overflow: hidden`, so a section without
        `minHeight: 0` + `overflowY: auto` does not scroll — it is *clipped*,
        and everything past the fold becomes unreachable.
      */}
      <Box
        component="section"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 2, md: 3 },
        }}
      >
        {!isDesktop && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open documentation menu">
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1">Documentation</Typography>
          </Stack>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}
