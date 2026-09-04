import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, useOptimisticValue, type DeviceId } from '../../../foundation';

export interface DeviceToggleTileProps {
  id: DeviceId;
  name: string;
  room?: string;
  on: boolean;
  reachable?: boolean;
  /** Rendered when the device is on: "60%", "22°C". */
  detail?: string;
  onToggle: (next: boolean) => Promise<void>;
}

/**
 * A large press-anywhere tile, for a wall panel or a phone home screen.
 *
 * The whole tile is the button. On a panel mounted by a door, a 20px switch is
 * unusable; the target here is the card.
 *
 * State is legible without colour: the tile says "On" or "Off" in text, so it
 * works in a hallway, at a glance, and to a screen reader.
 */
export const DeviceToggleTile = memo(function DeviceToggleTile({
  name,
  room,
  on,
  reachable = true,
  detail,
  onToggle,
}: DeviceToggleTileProps) {
  const [power, toggle, pending] = useOptimisticValue(on, async (next) => {
    await onToggle(next);
  });

  return (
    <Paper
      component="button"
      type="button"
      variant="outlined"
      disabled={!reachable || pending}
      aria-pressed={power}
      aria-label={describe(
        name,
        room,
        reachable ? (power ? 'on' : 'off') : 'not responding',
        detail,
        reachable ? `Turn ${power ? 'off' : 'on'}` : undefined,
      )}
      onClick={() => {
        toggle(!power);
      }}
      sx={{
        width: 160,
        height: 120,
        p: 2,
        textAlign: 'left',
        cursor: reachable ? 'pointer' : 'not-allowed',
        bgcolor: power && reachable ? 'primary.main' : 'background.paper',
        color: power && reachable ? 'primary.contrastText' : 'text.primary',
        opacity: reachable ? 1 : 0.6,
        transition: 'background-color 160ms',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Stack sx={{ height: '100%' }} justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="subtitle2" fontWeight={700} noWrap aria-hidden>
            {name}
          </Typography>
          {room ? (
            <Typography variant="caption" sx={{ opacity: 0.8 }} aria-hidden>
              {room}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} aria-hidden>
          {pending ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            // The word, not just the colour.
            <Typography variant="body2" fontWeight={700}>
              {reachable ? (power ? 'On' : 'Off') : 'No response'}
            </Typography>
          )}
          {detail && power && reachable ? (
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {detail}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
});
