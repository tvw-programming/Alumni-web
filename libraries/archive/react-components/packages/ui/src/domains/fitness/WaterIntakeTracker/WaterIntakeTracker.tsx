import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useOptimisticValue } from '../../../foundation';

export interface WaterIntakeTrackerProps {
  /** Millilitres drunk today. */
  currentMl: number;
  goalMl: number;
  /** Quick-add sizes in ml. */
  presets: number[];
  onChange: (nextMl: number) => Promise<void>;
}

/**
 * Water intake for the day.
 *
 * Quick-add presets in real container sizes — a glass, a bottle — because
 * nobody knows what 250 ml looks like but everybody knows what a glass is.
 *
 * Over-goal is celebrated, not clamped: drinking more than the target is fine,
 * and a bar that sticks at 100% hides how much was actually drunk.
 */
export function WaterIntakeTracker({
  currentMl,
  goalMl,
  presets,
  onChange,
}: WaterIntakeTrackerProps) {
  const [current, setCurrent, pending] = useOptimisticValue(currentMl, async (next) => {
    await onChange(next);
  });

  const percent = goalMl === 0 ? 0 : Math.round((current / goalMl) * 100);
  const complete = current >= goalMl;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="h5" fontWeight={700} aria-hidden>
          {`${String(current)} ml`}
        </Typography>
        <Typography variant="body2" color="text.secondary" aria-hidden>
          {`of ${String(goalMl)} ml`}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        // Capped for the bar, not for the number: over-goal still reads honestly.
        value={Math.min(percent, 100)}
        color={complete ? 'success' : 'primary'}
        sx={{ height: 10, borderRadius: 5 }}
        aria-label={`${String(current)} of ${String(goalMl)} millilitres, ${String(percent)} percent${
          complete ? ', goal reached' : ''
        }`}
      />

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <IconButton
          size="small"
          aria-label="Remove 250 millilitres"
          disabled={pending || current === 0}
          onClick={() => {
            setCurrent(Math.max(0, current - 250));
          }}
        >
          <RemoveIcon />
        </IconButton>

        {/* Real container sizes: nobody knows what 250 ml looks like. */}
        {presets.map((preset) => (
          <Button
            key={preset}
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={pending}
            onClick={() => {
              setCurrent(current + preset);
            }}
            aria-label={`Add ${String(preset)} millilitres`}
          >
            {preset >= 500 ? `Bottle ${String(preset)} ml` : `Glass ${String(preset)} ml`}
          </Button>
        ))}
      </Stack>

      {complete ? (
        <Typography variant="caption" color="success.main" role="status">
          {`Goal reached${current > goalMl ? ` · ${String(current - goalMl)} ml over` : ''}`}
        </Typography>
      ) : null}
    </Stack>
  );
}
