import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PauseIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayIcon from '@mui/icons-material/PlayCircleOutlined';
import { fonts, tokens } from '../../theme';
import { REFRESH_INTERVAL_MS } from '../../hooks/useRun';

interface Props {
  secondsUntilRefresh: number;
  loading: boolean;
  autoRefresh: boolean;
  onToggleAuto: () => void;
  onRefreshNow: () => void;
}

/** m:ss once there is a minute or more left, plain seconds below that. */
function clock(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Inside the ring there is room for three characters, so a long interval counts
 * down in whole minutes and only switches to seconds for the final one. The
 * exact figure is in the tooltip.
 */
function ringLabel(seconds: number): string {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`;
  return String(seconds);
}

/**
 * A countdown ring rather than a bare timestamp: the reader can see the next
 * refresh coming instead of being surprised by a repaint.
 */
export default function RefreshIndicator({
  secondsUntilRefresh,
  loading,
  autoRefresh,
  onToggleAuto,
  onRefreshNow,
}: Props) {
  const total = REFRESH_INTERVAL_MS / 1000;
  const progress = autoRefresh ? ((total - secondsUntilRefresh) / total) * 100 : 0;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Tooltip
        title={
          autoRefresh
            ? `Refreshing in ${clock(secondsUntilRefresh)} — every ${clock(total)}`
            : 'Auto-refresh is paused'
        }
      >
        <Box sx={{ position: 'relative', display: 'inline-flex', mr: 0.5 }}>
          <CircularProgress
            variant={loading ? 'indeterminate' : 'determinate'}
            value={progress}
            size={30}
            thickness={3}
            sx={{ color: autoRefresh ? tokens.live : tokens.idle }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 9.5,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {autoRefresh ? ringLabel(secondsUntilRefresh) : '—'}
            </Typography>
          </Box>
        </Box>
      </Tooltip>

      <Tooltip title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}>
        <IconButton size="small" onClick={onToggleAuto} aria-label="Toggle auto refresh">
          {autoRefresh ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Refresh now">
        <span>
          <IconButton size="small" onClick={onRefreshNow} disabled={loading} aria-label="Refresh now">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
