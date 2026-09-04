import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { NavLink, Outlet, useNavigation } from 'react-router-dom';

import { AppBreadcrumbs } from '@/components/AppBreadcrumbs/AppBreadcrumbs';
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';
import { PUBLIC_NAV } from '@/routes/navigation';
import { SpeechControls } from '@/speech/SpeechControls';
import { useNavigationCommands } from '@/speech/useNavigationCommands';

import { SkipToContentLink, useFocusMainOnRouteChange } from './a11y';
import { PublicFooter } from './PublicFooter';
import { ThemeControls } from './ThemeControls';

const MAIN_ID = 'public-main';

const activeSx = {
  '&.active': { fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 4 },
} as const;

/** Public marketing shell: top nav + footer, no admin chrome. */
export function PublicLayout() {
  const navigation = useNavigation();
  const mainRef = useRef<HTMLElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  useFocusMainOnRouteChange(mainRef);
  useNavigationCommands(PUBLIC_NAV, 'Pages');

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <SkipToContentLink targetId={MAIN_ID} />
      <AppBar position="sticky" component="nav" aria-label="Primary">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="span" sx={{ mr: 2 }}>
            Idol-Promo
          </Typography>

          {/* Desktop links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {PUBLIC_NAV.map((item) => (
              <Button
                key={item.to}
                color="inherit"
                component={NavLink}
                to={item.to}
                end={item.end}
                sx={activeSx}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile hamburger */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              aria-label="Open navigation menu"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu}>
              {PUBLIC_NAV.map((item) => (
                <MenuItem
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.end}
                  onClick={closeMenu}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Box flexGrow={1} />
          <SpeechControls />
          <ThemeControls />
        </Toolbar>
        {navigation.state === 'loading' && <LinearProgress color="secondary" />}
      </AppBar>

      <Container
        component="main"
        id={MAIN_ID}
        ref={mainRef}
        tabIndex={-1}
        maxWidth="xl"
        sx={{ py: 4, flexGrow: 1, outline: 'none' }}
      >
        {/* Renders nothing on the home page, which has nothing above it. */}
        <AppBreadcrumbs />
        <AppErrorBoundary>
          <Outlet />
        </AppErrorBoundary>
      </Container>

      <PublicFooter />
    </Box>
  );
}
