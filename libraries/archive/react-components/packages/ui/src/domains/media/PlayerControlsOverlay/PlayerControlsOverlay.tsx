import CastIcon from '@mui/icons-material/Cast';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import Forward10Icon from '@mui/icons-material/Forward10';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Replay10Icon from '@mui/icons-material/Replay10';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type PlaybackState = 'playing' | 'paused' | 'buffering' | 'reconnecting' | 'error';

export interface PlayerControlsOverlayProps {
  state: PlaybackState;
  positionSeconds: number;
  durationSeconds: number;
  captionsOn?: boolean;
  errorMessage?: string;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onToggleCaptions?: () => void;
  onOpenSettings?: () => void;
  onCast?: () => void;
  onFullscreen?: () => void;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes)}:${String(rest).padStart(2, '0')}`;
}

/**
 * The player overlay.
 *
 * **The media engine is authoritative for position and playback state**, not
 * React. This component renders what the engine reports and sends commands
 * back; it never predicts. A scrubber driven by optimistic state drifts from
 * the video within seconds, and the two never reconcile.
 *
 * That is also why there is no Action here. React 19 Actions belong to the
 * *preferences* around playback — saving the watch position, a subtitle choice,
 * a quality setting — not to playback itself.
 */
export function PlayerControlsOverlay({
  state,
  positionSeconds,
  durationSeconds,
  captionsOn = false,
  errorMessage,
  onPlayPause,
  onSeek,
  onToggleCaptions,
  onOpenSettings,
  onCast,
  onFullscreen,
}: PlayerControlsOverlayProps) {
  const playing = state === 'playing';
  const busy = state === 'buffering' || state === 'reconnecting';

  return (
    <Box
      sx={{
        p: 2,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        color: 'common.white',
      }}
    >
      {/* Transient states are announced, not just drawn — a spinner over a
          black frame tells a screen-reader user nothing. */}
      <Box aria-live="polite" sx={{ minHeight: 20 }}>
        {state === 'buffering' ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={14} color="inherit" />
            <Typography variant="caption">Buffering…</Typography>
          </Stack>
        ) : null}
        {state === 'reconnecting' ? (
          <Typography variant="caption">Trying to reconnect…</Typography>
        ) : null}
        {state === 'error' ? (
          <Typography variant="caption" color="error.light" role="alert">
            {errorMessage ?? 'Video unavailable'}
          </Typography>
        ) : null}
      </Box>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>
          {formatTime(positionSeconds)}
        </Typography>

        <Slider
          size="small"
          value={Math.min(positionSeconds, durationSeconds)}
          max={durationSeconds || 1}
          onChange={(_event, next) => {
            onSeek(next);
          }}
          aria-label="Seek"
          getAriaValueText={(value) => `${formatTime(value)} of ${formatTime(durationSeconds)}`}
          sx={{ color: 'common.white', flexGrow: 1 }}
        />

        <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>
          {formatTime(durationSeconds)}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton
          aria-label="Seek back 10 seconds"
          color="inherit"
          onClick={() => {
            onSeek(Math.max(0, positionSeconds - 10));
          }}
        >
          <Replay10Icon />
        </IconButton>

        <IconButton aria-label={playing ? 'Pause' : 'Play'} color="inherit" onClick={onPlayPause}>
          {busy ? (
            <CircularProgress size={22} color="inherit" />
          ) : playing ? (
            <PauseIcon />
          ) : (
            <PlayArrowIcon />
          )}
        </IconButton>

        <IconButton
          aria-label="Seek forward 10 seconds"
          color="inherit"
          onClick={() => {
            onSeek(Math.min(durationSeconds, positionSeconds + 10));
          }}
        >
          <Forward10Icon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        {onToggleCaptions ? (
          <IconButton
            aria-label={captionsOn ? 'Turn captions off' : 'Turn captions on'}
            aria-pressed={captionsOn}
            color={captionsOn ? 'primary' : 'inherit'}
            onClick={onToggleCaptions}
          >
            <ClosedCaptionIcon />
          </IconButton>
        ) : null}
        {onOpenSettings ? (
          <IconButton
            aria-label="Audio, subtitles and quality"
            color="inherit"
            onClick={onOpenSettings}
          >
            <SettingsIcon />
          </IconButton>
        ) : null}
        {onCast ? (
          <IconButton aria-label="Cast to a device" color="inherit" onClick={onCast}>
            <CastIcon />
          </IconButton>
        ) : null}
        {onFullscreen ? (
          <IconButton aria-label="Full screen" color="inherit" onClick={onFullscreen}>
            <FullscreenIcon />
          </IconButton>
        ) : null}
      </Stack>
    </Box>
  );
}
