import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, type ContentId } from '../../../foundation';

import { WatchlistToggle } from '../WatchlistToggle/WatchlistToggle';

export interface ContentItem {
  id: ContentId;
  title: string;
  posterUri?: string;
  year?: number;
  maturityRating?: string;
  durationLabel?: string;
  /** 0–100 for a continue-watching row. */
  progressPercent?: number;
  inWatchlist?: boolean;
  /** Set when the title cannot be played here — region, plan, expired. */
  unavailableReason?: string;
}

export interface ContentPosterCardProps {
  item: ContentItem;
  orientation?: 'portrait' | 'landscape';
  onPlay: () => void;
  onToggleWatchlist?: (next: boolean) => Promise<void>;
}

/**
 * A poster tile.
 *
 * Artwork is decorative: the title is rendered as **text under the poster**,
 * not baked into the image. A poster-only rail is unreadable to a screen reader
 * and unusable when the CDN is slow — and both happen constantly.
 *
 * `unavailableReason` is stated rather than hidden. "Not available in your
 * region" on the tile prevents a click, a spinner and a dead end.
 */
export const ContentPosterCard = memo(function ContentPosterCard({
  item,
  orientation = 'portrait',
  onPlay,
  onToggleWatchlist,
}: ContentPosterCardProps) {
  const unavailable = item.unavailableReason !== undefined;

  return (
    <Card
      variant="outlined"
      sx={{ width: orientation === 'portrait' ? 150 : 260, flexShrink: 0, position: 'relative' }}
    >
      <CardActionArea
        disabled={unavailable}
        onClick={onPlay}
        aria-label={describe(
          item.title,
          item.year,
          item.maturityRating,
          item.durationLabel,
          item.progressPercent !== undefined
            ? `${String(item.progressPercent)} percent watched`
            : undefined,
          item.unavailableReason ?? 'Play',
        )}
      >
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={item.posterUri}
            alt=""
            sx={{
              width: '100%',
              aspectRatio: orientation === 'portrait' ? '2 / 3' : '16 / 9',
              objectFit: 'cover',
              display: 'block',
              bgcolor: 'action.hover',
              filter: unavailable ? 'grayscale(1)' : 'none',
            }}
          />

          {!unavailable ? (
            <PlayArrowIcon
              aria-hidden
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                color: 'common.white',
                bgcolor: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                p: 0.25,
              }}
            />
          ) : null}

          {item.progressPercent !== undefined ? (
            <LinearProgress
              variant="determinate"
              value={item.progressPercent}
              aria-hidden
              sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }}
            />
          ) : null}
        </Box>

        {/* The title as text, always. */}
        <Stack sx={{ p: 1 }} spacing={0.25}>
          <Typography variant="body2" fontWeight={600} noWrap aria-hidden>
            {item.title}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" aria-hidden>
            {item.maturityRating ? (
              <Chip
                size="small"
                variant="outlined"
                label={item.maturityRating}
                sx={{ height: 18, fontSize: 10 }}
              />
            ) : null}
            <Typography variant="caption" color="text.secondary" noWrap>
              {[item.year, item.durationLabel].filter(Boolean).join(' · ')}
            </Typography>
          </Stack>
          {unavailable ? (
            <Typography variant="caption" color="warning.main" aria-hidden>
              {item.unavailableReason}
            </Typography>
          ) : null}
        </Stack>
      </CardActionArea>

      {onToggleWatchlist ? (
        <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
          <WatchlistToggle
            contentId={item.id}
            title={item.title}
            inWatchlist={item.inWatchlist ?? false}
            onToggle={onToggleWatchlist}
          />
        </Box>
      ) : null}
    </Card>
  );
});
