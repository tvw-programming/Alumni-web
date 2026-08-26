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
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { DomainComponentTree } from '@/features/admin/domainComponents/DomainComponentTree';
import { MASTER_DATA_NAV } from '@/routes/navigation';
import { useSpeechSelector } from '@/speech/speechStore';
import { useMasterDataCommands } from '@/speech/useNavigationCommands';

/**
 * 300, not 240: the sidebar now carries a two-level tree, and at 240 component
 * names like `PlayerControlsOverlay` were ellipsised at every indent level.
 */
const DRAWER_WIDTH = 300;

/** Width of the ordinal gutter. Reserved whether or not a number is drawn. */
const ORDINAL_SLOT_WIDTH = 22;

function SidebarList({ onNavigate }: { onNavigate?: () => void }) {
  // Subscribed here rather than in MasterDataLayout on purpose: toggling the mic
  // must re-render this list only, never the routed page under the Outlet.
  const showOrdinals = useSpeechSelector((state) => state.status === 'listening');

  return (
    <List component="nav" aria-label="Master data sections">
      {MASTER_DATA_NAV.map((item, index) => (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          onClick={onNavigate}
          sx={{ '&.active': { bgcolor: 'action.selected' } }}
        >
          {/* The gutter is always in the layout and only its contents fade, so
              turning the mic on or off cannot reflow a single row — no shift,
              no repaint of the list geometry. Hiding by unmounting would move
              every label sideways and flash the whole sidebar. */}
          <Box
            aria-hidden
            sx={{
              width: ORDINAL_SLOT_WIDTH,
              flexShrink: 0,
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: 'text.secondary',
              opacity: showOrdinals ? 1 : 0,
              transition: 'opacity 160ms ease',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            {index + 1}
          </Box>
          <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );
}

/**
 * The sidebar's two halves.
 *
 * Above: the thirteen numbered sections, which the speech layer addresses by
 * position. Below: the domain-wise component tree, deliberately unnumbered —
 * adding 99 more numbered rows would make "open the fourth menu" ambiguous.
 */
function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <SidebarList onNavigate={onNavigate} />
      <DomainComponentTree onNavigate={onNavigate} />
    </>
  );
}

/** Master Data shell: persistent sidebar (md+) / overlay drawer (below md) + Outlet. */
export function MasterDataLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // The sidebar is the deepest navigation in the app and the most tedious to
  // click through, so it is the surface voice helps most.
  useMasterDataCommands(MASTER_DATA_NAV);

  return (
    <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              // `position: relative` takes the paper out of the fixed
              // positioning MUI defaults to, so it needs an explicit height —
              // `100%` of this row (which itself is bounded to the viewport
              // minus the AppBar by AdminShellLayout) so the sidebar always
              // spans the full available height instead of only as tall as
              // its own link list.
              position: 'relative',
              height: '100%',
              boxSizing: 'border-box',
              borderRight: 1,
              borderColor: 'divider',
              overflowY: 'auto',
            },
          }}
        >
          <Sidebar />
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}
        >
          <Toolbar variant="dense" />
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!isDesktop && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <IconButton
              aria-label="Open master data menu"
              onClick={() => setMobileOpen(true)}
              edge="start"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1">Master Data</Typography>
          </Stack>
        )}
        {/* Scrollable content area, independent of the sidebar. `minHeight: 0`
            is what lets this shrink below its content's natural height so
            `overflowY: auto` actually engages instead of the whole page
            growing; must stay a flex column so pages using flexGrow (e.g.
            FormGridSplit) receive the available height instead of collapsing
            to 0. */}
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            px: { xs: 0, md: 3 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
