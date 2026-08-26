import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, type ContentId } from '../../../foundation';

export interface Episode {
  id: ContentId;
  number: number;
  title: string;
  synopsis: string;
  durationLabel: string;
  stillUri?: string;
  progressPercent?: number;
  watched?: boolean;
  /** Set when the episode has not aired or is not in this plan. */
  unavailableReason?: string;
  releasesOn?: string;
}

export interface EpisodeListItemProps {
  episode: Episode;
  onPlay: () => void;
}

/**
 * One episode in a season list.
 *
 * The synopsis is present but clamped to two lines. Hiding it behind an
 * expander means a viewer choosing where to resume has to open five episodes to
 * find the one they remember.
 *
 * An unaired episode is listed with its date rather than omitted — "Releases
 * 28 Aug" is the single most-wanted piece of information on a season page.
 */
export const EpisodeListItem = memo(function EpisodeListItem({
  episode,
  onPlay,
}: EpisodeListItemProps) {
  const unavailable = episode.unavailableReason !== undefined;

  return (
    <ListItemButton
      disabled={unavailable}
      onClick={onPlay}
      sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.5 }}
      aria-label={describe(
        `Episode ${String(episode.number)}`,
        episode.title,
        episode.durationLabel,
        episode.watched === true ? 'watched' : undefined,
        episode.progressPercent !== undefined
          ? `${String(episode.progressPercent)} percent watched`
          : undefined,
        episode.unavailableReason,
        episode.releasesOn ? `releases ${episode.releasesOn}` : undefined,
        episode.synopsis,
      )}
    >
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Box
          component="img"
          src={episode.stillUri}
          alt=""
          sx={{
            width: 120,
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            borderRadius: 1,
            bgcolor: 'action.hover',
            filter: unavailable ? 'grayscale(1)' : 'none',
          }}
        />
        {!unavailable ? (
          <PlayArrowIcon
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              m: 'auto',
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.45)',
              borderRadius: '50%',
              p: 0.25,
            }}
          />
        ) : null}
        {episode.progressPercent !== undefined ? (
          <LinearProgress
            variant="determinate"
            value={episode.progressPercent}
            aria-hidden
            sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 1 }}
          />
        ) : null}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          aria-hidden
        >
          <Typography variant="body2" fontWeight={600}>
            {`${String(episode.number)}. ${episode.title}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {episode.durationLabel}
          </Typography>
          {episode.watched === true ? (
            <Chip
              size="small"
              variant="outlined"
              label="Watched"
              sx={{ height: 18, fontSize: 10 }}
            />
          ) : null}
        </Stack>

        {/* Present, clamped — not hidden behind an expander. */}
        <Typography
          variant="caption"
          color="text.secondary"
          aria-hidden
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mt: 0.25,
          }}
        >
          {episode.synopsis}
        </Typography>

        {unavailable ? (
          <Typography
            variant="caption"
            color="warning.main"
            display="block"
            sx={{ mt: 0.25 }}
            aria-hidden
          >
            {episode.releasesOn ? `Releases ${episode.releasesOn}` : episode.unavailableReason}
          </Typography>
        ) : null}
      </Box>
    </ListItemButton>
  );
});
