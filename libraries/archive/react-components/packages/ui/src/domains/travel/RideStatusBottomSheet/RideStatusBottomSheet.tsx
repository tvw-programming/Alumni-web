import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAction } from '../../../foundation';

import type { ReactNode } from 'react';

export type TripPhase =
  | 'findingDriver'
  | 'driverAssigned'
  | 'driverArriving'
  | 'driverArrived'
  | 'inProgress'
  | 'completed'
  | 'locationUnavailable';

export interface RideStatusBottomSheetProps {
  open: boolean;
  phase: TripPhase;
  etaLabel?: string;
  /** The OTP the rider gives the driver. Shown only before the trip starts. */
  otp?: string;
  children?: ReactNode;
  onCancel?: () => Promise<void>;
  onSafety?: () => void;
}

const PHASE_COPY: Record<TripPhase, { title: string; body?: string }> = {
  findingDriver: { title: 'Finding your driver', body: 'Usually under a minute.' },
  driverAssigned: { title: 'Driver assigned' },
  driverArriving: { title: 'Driver arriving' },
  driverArrived: { title: 'Driver has arrived', body: 'Check the number plate before getting in.' },
  inProgress: { title: 'Trip in progress' },
  completed: { title: 'Trip complete' },
  locationUnavailable: {
    title: 'Location temporarily unavailable',
    body: 'We have lost GPS. Your trip is still active.',
  },
};

/**
 * The trip sheet.
 *
 * Every phase is named, including `locationUnavailable` — losing GPS is not the
 * trip ending, and a sheet that goes blank when the map does convinces a rider
 * something has gone badly wrong.
 *
 * The **safety button is always present**, in every phase. A control that
 * appears only in certain states is one nobody can find in the state where they
 * need it.
 *
 * The OTP disappears once the trip starts: it is proof of the right car, and
 * showing it afterwards trains people to read it out to anyone who asks.
 */
export function RideStatusBottomSheet({
  open,
  phase,
  etaLabel,
  otp,
  children,
  onCancel,
  onSafety,
}: RideStatusBottomSheetProps) {
  const [result, cancel, cancelling] = useAction<void, 'cancelled'>(async () => {
    await onCancel?.();
    return 'cancelled';
  });

  const copy = PHASE_COPY[phase];
  const beforeTrip =
    phase === 'findingDriver' ||
    phase === 'driverAssigned' ||
    phase === 'driverArriving' ||
    phase === 'driverArrived';

  return (
    <Drawer
      anchor="bottom"
      open={open}
      variant="persistent"
      slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }}
    >
      <Box sx={{ p: 2 }}>
        <Box
          sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 1.5 }}
          aria-hidden
        />

        <Stack direction="row" alignItems="center" spacing={1}>
          <Stack sx={{ flexGrow: 1 }}>
            <Typography variant="h6" role="status">
              {copy.title}
            </Typography>
            {copy.body ? (
              <Typography variant="caption" color="text.secondary">
                {copy.body}
              </Typography>
            ) : null}
          </Stack>

          {etaLabel ? (
            <Typography variant="subtitle2" fontWeight={700}>
              {etaLabel}
            </Typography>
          ) : null}
        </Stack>

        {phase === 'findingDriver' ? <LinearProgress sx={{ mt: 1.5 }} /> : null}

        {phase === 'locationUnavailable' ? (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Your trip is still active and your driver can still see the route.
          </Alert>
        ) : null}

        {otp && beforeTrip ? (
          <Stack alignItems="center" sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Give this to your driver
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ letterSpacing: 6, fontFamily: 'monospace' }}
              aria-label={`Trip code ${otp.split('').join(' ')}`}
            >
              {otp}
            </Typography>
          </Stack>
        ) : null}

        {children ? <Box sx={{ mt: 2 }}>{children}</Box> : null}

        {result.status === 'error' ? (
          <Alert severity="error" sx={{ mt: 1.5 }} role="alert">
            {result.message}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {/* Always present, in every phase. */}
          {onSafety ? (
            <Button
              color="error"
              variant="outlined"
              startIcon={<ShieldOutlinedIcon />}
              onClick={onSafety}
              sx={{ flexGrow: 1 }}
            >
              Safety
            </Button>
          ) : null}

          {onCancel && beforeTrip ? (
            <Button
              color="inherit"
              disabled={cancelling}
              onClick={() => {
                cancel();
              }}
              sx={{ flexGrow: 1 }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel trip'}
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Drawer>
  );
}
