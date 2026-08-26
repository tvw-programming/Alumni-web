import BedtimeIcon from '@mui/icons-material/Bedtime';
import DownloadIcon from '@mui/icons-material/Download';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { describe, useOptimisticValue } from '../../../foundation';

export type SessionPlayback = 'idle' | 'playing' | 'paused' | 'buffering' | 'unavailable';

export interface MeditationSession {
  id: string;
  title: string;
  teacher?: string;
  durationLabel: string;
  category: string;
  positionPercent?: number;
  favourite: boolean;
  downloaded?: boolean;
}

export interface MeditationPlayerCardProps {
  session: MeditationSession;
  playback: SessionPlayback;
  sleepTimerLabel?: string;
  sleepTimerOptions?: number[];
  onPlayPause: () => void;
  onToggleFavourite: (next: boolean) => Promise<void>;
  onSetSleepTimer?: (minutes: number) => void;
  onDownload?: () => Promise<void>;
}

/**
 * A guided session.
 *
 * Favouriting is optimistic — the user's own list. **Completion is not**: a
 * session counts as finished when the audio engine says so, and a mindful-minute
 * total that includes sessions nobody listened to is a number that means
 * nothing.
 *
 * `positionPercent` produces "Continue" rather than "Begin", because returning
 * to a half-finished session is the normal case for this content, not an edge.
 *
 * The sleep timer is here rather than in a settings screen: it is decided at the
 * moment of pressing play, usually in the dark.
 */
export function MeditationPlayerCard({
  session,
  playback,
  sleepTimerLabel,
  sleepTimerOptions = [5, 10, 15, 30],
  onPlayPause,
  onToggleFavourite,
  onSetSleepTimer,
  onDownload,
}: MeditationPlayerCardProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [favourite, toggleFavourite, favouritePending] = useOptimisticValue(
    session.favourite,
    async (next) => {
      await onToggleFavourite(next);
    },
  );

  const playing = playback === 'playing';
  const unavailable = playback === 'unavailable';
  const started = (session.positionPercent ?? 0) > 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            size="large"
            color="primary"
            disabled={unavailable}
            onClick={onPlayPause}
            aria-label={
              unavailable
                ? `Playback unavailable for ${session.title}`
                : `${playing ? 'Pause' : started ? 'Continue' : 'Begin'} ${session.title}`
            }
            sx={{ border: 1, borderColor: 'divider' }}
          >
            {playing ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>

          <Stack
            sx={{ flexGrow: 1, minWidth: 0 }}
            aria-label={describe(
              session.title,
              session.teacher,
              session.category,
              session.durationLabel,
              started ? `${String(session.positionPercent)} percent complete` : undefined,
              favourite ? 'in your favourites' : undefined,
              sleepTimerLabel,
            )}
          >
            <Typography variant="subtitle2" fontWeight={700} noWrap aria-hidden>
              {session.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap aria-hidden>
              {[session.teacher, session.category, session.durationLabel]
                .filter(Boolean)
                .join(' · ')}
            </Typography>

            {playback === 'buffering' ? (
              <Typography variant="caption" color="text.secondary" role="status">
                Buffering…
              </Typography>
            ) : null}
            {unavailable ? (
              <Typography variant="caption" color="error.main" role="status">
                Playback unavailable
              </Typography>
            ) : null}
            {sleepTimerLabel ? (
              <Typography variant="caption" color="primary.main" aria-hidden>
                {sleepTimerLabel}
              </Typography>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={0.5}>
            {onSetSleepTimer ? (
              <IconButton
                aria-label="Set a sleep timer"
                onClick={(event) => {
                  setAnchor(event.currentTarget);
                }}
              >
                <BedtimeIcon />
              </IconButton>
            ) : null}

            {onDownload ? (
              <IconButton
                aria-label={
                  session.downloaded === true
                    ? `${session.title} is downloaded for offline listening`
                    : `Download ${session.title} for offline listening`
                }
                disabled={session.downloaded === true}
                onClick={() => {
                  void onDownload();
                }}
              >
                <DownloadIcon color={session.downloaded === true ? 'success' : 'inherit'} />
              </IconButton>
            ) : null}

            <IconButton
              aria-label={
                favourite
                  ? `Remove ${session.title} from favourites`
                  : `Add ${session.title} to favourites`
              }
              aria-pressed={favourite}
              disabled={favouritePending}
              onClick={() => {
                toggleFavourite(!favourite);
              }}
            >
              {favourite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
            </IconButton>
          </Stack>
        </Stack>

        {started ? (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={session.positionPercent ?? 0}
              aria-hidden
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        ) : null}

        <Menu
          anchorEl={anchor}
          open={anchor !== null}
          onClose={() => {
            setAnchor(null);
          }}
        >
          {sleepTimerOptions.map((minutes) => (
            <MenuItem
              key={minutes}
              onClick={() => {
                setAnchor(null);
                onSetSleepTimer?.(minutes);
              }}
            >
              {`Stop after ${String(minutes)} minutes`}
            </MenuItem>
          ))}
        </Menu>
      </CardContent>
    </Card>
  );
}
