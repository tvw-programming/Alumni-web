import LogoutIcon from '@mui/icons-material/Logout';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import LinearProgress from '@mui/material/LinearProgress';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useCallback, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useNavigation } from 'react-router-dom';

import { AppBreadcrumbs } from '@/components/AppBreadcrumbs/AppBreadcrumbs';
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';
import { ADMIN_NAV } from '@/routes/navigation';
import { SpeechControls } from '@/speech/SpeechControls';
import { useNavigationCommands } from '@/speech/useNavigationCommands';
import { useAuth } from '@/store/authContext';

import { SkipToContentLink, useFocusMainOnRouteChange } from './a11y';
import { ThemeControls } from './ThemeControls';

const MAIN_ID = 'admin-main';

const activeSx = {
  '&.active': { fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 4 },
} as const;

/** Authenticated admin shell: top nav + user menu, no public footer. */
export function AdminShellLayout() {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  useFocusMainOnRouteChange(mainRef);

  // Same array the buttons below render, so a link and its voice command can
  // never disagree about where "dashboard" goes.
  useNavigationCommands(ADMIN_NAV, 'Admin');

  const handleLogout = useCallback(() => {
    logout(); // clears session + invalidates cached queries
    void navigate('/', { replace: true });
  }, [logout, navigate]);

  const initial = user?.displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    // Pinned to the viewport (not just `minHeight`) so the page itself never
    // scrolls — every descendant flex item now has a real bounded height to
    // shrink into, which is what lets `overflow: auto` further down actually
    // do something instead of the whole document growing.
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <SkipToContentLink targetId={MAIN_ID} />
      <AppBar position="sticky" component="nav" aria-label="Admin">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="span" sx={{ mr: 2 }}>
            Admin
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {ADMIN_NAV.map((item) => (
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

          <Box flexGrow={1} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 14 }}>{initial}</Avatar>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {user?.displayName}
            </Typography>
          </Box>

          {/* Immediately left of the destructive Logout button and beside the
              other global toggles: a persistent, always-reachable control that
              is not in the tab path to anything dangerous. */}
          <SpeechControls onLogout={handleLogout} />

          <ThemeControls />

          <Button
            color="inherit"
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Toolbar>
        {navigation.state === 'loading' && <LinearProgress color="secondary" />}
      </AppBar>

      <Container
        component="main"
        id={MAIN_ID}
        ref={mainRef}
        tabIndex={-1}
        maxWidth={false}
        sx={{
          py: 3,
          flexGrow: 1,
          // `minHeight: 0` overrides the flex default (`auto`), which is what
          // actually allows this to shrink to the space left under the AppBar
          // instead of growing with its content. `overflow: hidden` keeps any
          // scrolling scoped to whichever descendant opts into it (e.g.
          // MasterDataLayout's outlet box) rather than happening here too.
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          outline: 'none',
        }}
      >
        {/*
          Above the outlet, so every admin page gets a trail without opting in —
          including the section layouts, whose own sidebars start below this.
        */}
        <AppBreadcrumbs />
        <AppErrorBoundary>
          <Outlet />
        </AppErrorBoundary>
      </Container>
    </Box>
  );
}
