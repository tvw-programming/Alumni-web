import { useEffect, useState } from 'react';
import { AppBar, Box, Button, Stack, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNewRounded';
import { Link, useLocation } from 'react-router-dom';
import { fonts, tokens } from '../../theme';
import { fetchProjectUi } from '../../api/client';
import RefreshIndicator from './RefreshIndicator';

interface Props {
  secondsUntilRefresh: number;
  loading: boolean;
  autoRefresh: boolean;
  onToggleAuto: () => void;
  onRefreshNow: () => void;
}

/** The spine mark, reused from the favicon so the identity is consistent. */
function Mark() {
  return (
    <Box
      component="svg"
      viewBox="0 0 32 32"
      aria-hidden
      sx={{ width: 26, height: 26, flexShrink: 0 }}
    >
      <line x1="16" y1="4" x2="16" y2="28" stroke={tokens.rule} strokeWidth="2" />
      <circle cx="16" cy="8" r="3" fill={tokens.pass} />
      <rect x="5" y="14" width="22" height="4" rx="2" fill={tokens.signal} />
      <circle cx="16" cy="24" r="3" fill={tokens.live} />
    </Box>
  );
}

export default function TopBar(props: Props) {
  const { pathname } = useLocation();
  const value = pathname.startsWith('/docs') ? '/docs' : '/';
  const [projectUi, setProjectUi] = useState<{ url: string; label: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchProjectUi().then((ui) => {
      if (!cancelled) setProjectUi(ui);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: tokens.ink,
        borderBottom: `1px solid ${tokens.rule}`,
        backgroundImage: 'none',
      }}
    >
      <Toolbar sx={{ gap: 3, minHeight: { xs: 56, sm: 60 }, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Mark />
          <Box>
            <Typography
              sx={{ fontFamily: fonts.ui, fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}
            >
              CodeGen Core
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 9.5,
                letterSpacing: '0.14em',
                color: 'text.secondary',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Run monitor
            </Typography>
          </Box>
        </Stack>

        <Tabs
          value={value}
          sx={{
            minHeight: 60,
            '& .MuiTabs-indicator': { backgroundColor: tokens.signal, height: 2 },
          }}
        >
          <Tab label="Run" value="/" component={Link} to="/" />
          <Tab label="Documentation" value="/docs" component={Link} to="/docs" />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        {projectUi && (
          <Button
            component="a"
            href={projectUi.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              color: tokens.signal,
              textTransform: 'none',
              fontFamily: fonts.ui,
              fontWeight: 500,
              fontSize: 13,
              px: 1.25,
              border: `1px solid ${tokens.rule}`,
              borderRadius: 1,
              '&:hover': {
                borderColor: tokens.signal,
                bgcolor: 'rgba(255,255,255,0.04)',
              },
            }}
          >
            {projectUi.label}
          </Button>
        )}

        <RefreshIndicator {...props} />
      </Toolbar>
    </AppBar>
  );
}
