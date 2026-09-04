import AddIcon from '@mui/icons-material/Add';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface RestTimerCircleProps {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  /** What comes next, so the rest has a purpose. */
  nextExerciseName?: string;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
  onToggleRun: () => void;
}

function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60))}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * The rest countdown between sets.
 *
 * The number is a **live region that announces at intervals, not every second**.
 * A timer that speaks each tick makes a screen reader unusable for the length of
 * the rest; announcing at the halfway point and the last ten seconds conveys the
 * same information.
 *
 * "Next: Dumbbell row" is on the dial because a rest with no visible purpose is
 * a rest people cut short.
 *
 * The countdown itself belongs to a timer service, not to React state — it has
 * to keep running with the screen off, which a component cannot do.
 */
export function RestTimerCircle({
  totalSeconds,
  remainingSeconds,
  running,
  nextExerciseName,
  onAddTime,
  onSkip,
  onToggleRun,
}: RestTimerCircleProps) {
  const fraction = totalSeconds === 0 ? 0 : (remainingSeconds / totalSeconds) * 100;
  const nearlyDone = remainingSeconds <= 10;

  // Announce at the halfway mark and inside the last ten seconds only.
  const announcement =
    remainingSeconds === Math.floor(totalSeconds / 2)
      ? `${formatSeconds(remainingSeconds)} of rest left`
      : nearlyDone && remainingSeconds > 0
        ? `${String(remainingSeconds)}`
        : remainingSeconds === 0
          ? `Rest over${nextExerciseName ? `. Next: ${nextExerciseName}` : ''}`
          : '';

  return (
    <Stack spacing={2} alignItems="center">
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={fraction}
          size={180}
          thickness={3}
          color={nearlyDone ? 'warning' : 'primary'}
          aria-hidden
        />
        <Stack
          sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
          spacing={0.25}
        >
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
            aria-hidden
          >
            {formatSeconds(remainingSeconds)}
          </Typography>
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {running ? 'Rest' : 'Paused'}
          </Typography>
        </Stack>
      </Box>

      {/* Polite, and deliberately sparse. */}
      <Typography aria-live="polite" sx={visuallyHidden}>
        {announcement}
      </Typography>

      {nextExerciseName ? (
        <Typography variant="body2" color="text.secondary">
          {`Next: ${nextExerciseName}`}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            onAddTime(30);
          }}
          aria-label="Add 30 seconds of rest"
        >
          30s
        </Button>
        <Button size="small" onClick={onToggleRun} aria-pressed={!running}>
          {running ? 'Pause' : 'Resume'}
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<SkipNextIcon />}
          onClick={onSkip}
          aria-label={nextExerciseName ? `Skip rest and start ${nextExerciseName}` : 'Skip rest'}
        >
          Skip
        </Button>
      </Stack>
    </Stack>
  );
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
