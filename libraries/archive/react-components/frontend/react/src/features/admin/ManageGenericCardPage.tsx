import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { GenericCard } from '@/components/GenericCard';
import { snackbar } from '@/components/snackbar/snackbarBus';

/**
 * Parent-owned orchestration for the reusable card showcase. The page owns
 * demo/business state; GenericCard owns only reusable rendering and controls.
 */
export function ManageGenericCardPage() {
  const [selected, setSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(true);
  const [hasApprovals, setHasApprovals] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  const retryService = () => {
    setShowError(false);
    snackbar.success('Service health refreshed');
  };

  return (
    <Stack spacing={3} pb={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">Generic Card</Typography>
        <Typography color="text.secondary">
          Reusable card states, composition slots, responsive surfaces, and optional window
          controls. Resize the analytics card from its bottom-right corner.
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" onClick={() => setLoading((value) => !value)}>
          {loading ? 'Show content' : 'Show loading state'}
        </Button>
        <Button variant="outlined" onClick={() => setShowError(true)}>
          Reset error example
        </Button>
        <Button variant="outlined" onClick={() => setHasApprovals((value) => !value)}>
          {hasApprovals ? 'Clear approvals' : 'Add approval'}
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <GenericCard
          aria-label="Select monthly revenue card"
          header={{
            title: 'Monthly revenue',
            subtitle: 'Updated 5 minutes ago',
            icon: <AnalyticsOutlinedIcon />,
            badge: <Chip label="+12.4%" color="success" size="small" />,
            metric: '₹8,42,300',
            description: 'Revenue across all active product categories.',
            action: (
              <IconButton aria-label="Open revenue card menu" size="small">
                <MoreVertIcon />
              </IconButton>
            ),
          }}
          state={{ loading }}
          appearance={{ surface: 'glass', hoverAnimation: true, selected, size: 'expanded' }}
          windowControls={{
            minimizable: true,
            minimized,
            onMinimizedChange: setMinimized,
            fullscreenable: true,
            fullScreen,
            onFullScreenChange: setFullScreen,
            resizable: true,
            minWidth: 280,
            minHeight: 260,
            maxWidth: 900,
            maxHeight: 720,
          }}
          onClick={() => setSelected((value) => !value)}
          slots={{
            body: (
              <Stack spacing={2}>
                <LinearProgress variant="determinate" value={72} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    72% of monthly target
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Target ₹11.7L
                  </Typography>
                </Stack>
              </Stack>
            ),
            footer: (
              <Button size="small" startIcon={<DashboardCustomizeIcon />}>
                Open report
              </Button>
            ),
          }}
        />

        <GenericCard
          header={{
            title: 'Pending approvals',
            subtitle: 'Workflow queue',
            icon: <PersonOutlineIcon />,
            badge: <Chip label={hasApprovals ? '1 pending' : 'Clear'} size="small" />,
          }}
          state={{
            empty: !hasApprovals,
            emptyTitle: 'No pending approvals',
            emptyDescription: 'New requests will appear here automatically.',
            emptyIcon: <CheckCircleOutlineIcon fontSize="large" />,
          }}
          appearance={{ surface: 'subtle' }}
          slots={{
            body: hasApprovals ? (
              <Stack spacing={1.5}>
                <Typography fontWeight={600}>New vendor registration</Typography>
                <Typography variant="body2" color="text.secondary">
                  Submitted by Operations · Today, 10:35
                </Typography>
                <Divider />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="small">
                    Review
                  </Button>
                  <Button variant="text" size="small">
                    Assign
                  </Button>
                </Stack>
              </Stack>
            ) : undefined,
          }}
        />

        <GenericCard
          header={{ title: 'Service health', subtitle: 'Inventory API' }}
          state={{
            error: showError ? 'The latest health check could not be retrieved.' : undefined,
            errorTitle: 'Health check unavailable',
            onRetry: retryService,
            retryLabel: 'Refresh',
          }}
          appearance={{ size: 'compact' }}
          slots={{
            body: (
              <Stack direction="row" alignItems="center" spacing={1} color="success.main">
                <CheckCircleOutlineIcon />
                <Typography color="text.primary">All systems operational</Typography>
              </Stack>
            ),
            footer: (
              <Button size="small" startIcon={<RefreshIcon />} onClick={() => setShowError(true)}>
                Run check
              </Button>
            ),
          }}
        />

        <GenericCard
          header={{
            title: 'Quick note',
            subtitle: 'Composed form content',
            badge: <Chip label="Draft" size="small" variant="outlined" />,
          }}
          // The default surface, not `accent`: the gradient sat behind opaque
          // form fields, so all that showed of it was a coloured frame around
          // them. Accent is for cards whose body is text the gradient can sit
          // behind — a metric or a summary — not for one holding inputs.
          slots={{
            body: (
              <Stack spacing={2}>
                {/* No `bgcolor` override — the fields inherit the card surface
                    now, so the theme's own input styling applies. */}
                <TextField label="Title" size="small" fullWidth />
                <TextField label="Note" multiline minRows={3} fullWidth />
              </Stack>
            ),
            footer: (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => snackbar.info('Parent handles note saving')}
              >
                Save note
              </Button>
            ),
          }}
        />

        <GenericCard
          header={{ title: 'Disabled card', subtitle: 'Interaction unavailable' }}
          appearance={{ size: 'compact' }}
          disabled
          onClick={() => snackbar.info('This callback is intentionally blocked')}
        >
          Disabled cards remain readable but cannot be selected or activated.
        </GenericCard>
      </Box>
    </Stack>
  );
}
