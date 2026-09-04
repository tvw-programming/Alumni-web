import CloseIcon from '@mui/icons-material/Close';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe } from '../../../foundation';

export interface MiniPlayerBarProps {
  title: string;
  subtitle?: string;
  artworkUri?: string;
  playing: boolean;
  progressPercent: number;
  remainingLabel?: string;
  onPlayPause: () => void;
  onExpand: () => void;
  onClose: () => void;
}

/**
 * The docked player.
 *
 * Three separate targets — expand, play/pause, close — and they are separated
 * deliberately. A bar where the whole surface expands and a 24px X closes is one
 * where people close the player by accident constantly, on a control they were
 * trying to press while walking.
 *
 * Playback state comes from the media engine, exactly as in
 * `PlayerControlsOverlay`. This bar renders it and sends commands.
 */
export function MiniPlayerBar({
  title,
  subtitle,
  artworkUri,
  playing,
  progressPercent,
  remainingLabel,
  onPlayPause,
  onExpand,
  onClose,
}: MiniPlayerBarProps) {
  return (
    <Paper elevation={8} sx={{ position: 'relative', overflow: 'hidden' }}>
      <LinearProgress
        variant="determinate"
        value={progressPercent}
        aria-hidden
        sx={{ height: 2 }}
      />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1 }}>
        <Box
          component="button"
          type="button"
          onClick={onExpand}
          aria-label={describe(`Expand player`, title, subtitle, remainingLabel)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexGrow: 1,
            minWidth: 0,
            border: 0,
            bgcolor: 'transparent',
            p: 0.5,
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: 1,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Box
            component="img"
            src={artworkUri}
            alt=""
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              objectFit: 'cover',
              bgcolor: 'action.hover',
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap aria-hidden>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block" aria-hidden>
              {[subtitle, remainingLabel].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        <IconButton aria-label={playing ? `Pause ${title}` : `Play ${title}`} onClick={onPlayPause}>
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        {/* Its own target, away from the expand surface. */}
        <IconButton aria-label={`Close player, stop playing ${title}`} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
