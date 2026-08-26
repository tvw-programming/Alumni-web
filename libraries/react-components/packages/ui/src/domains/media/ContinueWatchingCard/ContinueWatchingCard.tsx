import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, useOptimisticValue, type ContentId } from '../../../foundation';

export interface ContinueWatchingItem {
  id: ContentId;
  title: string;
  /** "S2 E4 · The Long Silence" for series, absent for films. */
  episodeLabel?: string;
  stillUri?: string;
  progressPercent: number;
  remainingLabel: string;
}

export interface ContinueWatchingCardProps {
  item: ContinueWatchingItem;
  onResume: () => void;
  /** Removing from the row. Optimistic — it is the user's own list. */
  onRemove?: () => Promise<void>;
}

/**
 * A resume tile.
 *
 * **Time remaining, not percent.** "23 min left" is a decision people can make
 * before bed; "68%" is arithmetic they have to do first.
 *
 * Removal is offered on every tile. A continue-watching row that cannot be
 * cleared fills with things the user abandoned on purpose, and it is the most
 * common complaint about the pattern.
 */
export const ContinueWatchingCard = memo(function ContinueWatchingCard({
  item,
  onResume,
  onRemove,
}: ContinueWatchingCardProps) {
  const [removed, remove, pending] = useOptimisticValue(false, async () => {
    await onRemove?.();
  });

  if (removed) return null;

  return (
    <Card
      variant="outlined"
      sx={{ width: 260, flexShrink: 0, position: 'relative', opacity: pending ? 0.5 : 1 }}
    >
      <CardActionArea
        onClick={onResume}
        aria-label={describe(
          `Resume ${item.title}`,
          item.episodeLabel,
          item.remainingLabel,
          `${String(item.progressPercent)} percent watched`,
        )}
      >
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={item.stillUri}
            alt=""
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              display: 'block',
              bgcolor: 'action.hover',
            }}
          />
          <PlayArrowIcon
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              m: 'auto',
              fontSize: 40,
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.45)',
              borderRadius: '50%',
            }}
          />
          <LinearProgress
            variant="determinate"
            value={item.progressPercent}
            aria-hidden
            sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 }}
          />
        </Box>

        <Stack sx={{ p: 1 }} spacing={0.25}>
          <Typography variant="body2" fontWeight={600} noWrap aria-hidden>
            {item.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap aria-hidden>
            {item.episodeLabel}
          </Typography>
          {/* Time remaining, not percent. */}
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {item.remainingLabel}
          </Typography>
        </Stack>
      </CardActionArea>

      {onRemove ? (
        <Tooltip title={`Remove ${item.title} from Continue watching`}>
          <IconButton
            size="small"
            aria-label={`Remove ${item.title} from Continue watching`}
            disabled={pending}
            onClick={() => {
              remove(true);
            }}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              bgcolor: 'rgba(0,0,0,0.45)',
              color: 'common.white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Card>
  );
});
