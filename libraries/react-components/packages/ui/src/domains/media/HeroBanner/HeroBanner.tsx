import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, type ContentId } from '../../../foundation';

import { WatchlistToggle } from '../WatchlistToggle/WatchlistToggle';

export interface HeroTitle {
  id: ContentId;
  title: string;
  /** The artwork. Decorative — the title is always rendered as text. */
  backdropUri: string;
  logline: string;
  year?: number;
  maturityRating?: string;
  durationLabel?: string;
  genres?: string[];
  inWatchlist?: boolean;
  resumeLabel?: string;
}

export interface HeroBannerProps {
  title: HeroTitle;
  onPlay: () => void;
  onMoreInfo?: () => void;
  onToggleWatchlist?: (next: boolean) => Promise<void>;
}

/**
 * The featured title at the top of a catalogue.
 *
 * The title is **text over the image**, never a title-treatment PNG baked into
 * the artwork. A logo image carries no text for a screen reader, does not
 * reflow, and disappears entirely when the CDN is slow — which is precisely
 * when the user is staring at the top of the page.
 *
 * The gradient is what keeps the text readable over arbitrary artwork; without
 * it, contrast depends on whatever the still happens to look like.
 */
export function HeroBanner({ title, onPlay, onMoreInfo, onToggleWatchlist }: HeroBannerProps) {
  return (
    <Box
      component="section"
      aria-label={describe(
        'Featured',
        title.title,
        title.year,
        title.maturityRating,
        title.durationLabel,
        title.genres?.join(', '),
        title.logline,
      )}
      sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', minHeight: 320 }}
    >
      <Box
        component="img"
        src={title.backdropUri}
        alt=""
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Readability that does not depend on what the artwork looks like. */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.15) 100%)',
        }}
      />

      <Stack
        spacing={1.5}
        sx={{ position: 'relative', p: { xs: 2, md: 4 }, maxWidth: 620, color: 'common.white' }}
      >
        <Typography variant="h4" fontWeight={800} aria-hidden>
          {title.title}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          aria-hidden
        >
          {title.maturityRating ? (
            <Chip
              size="small"
              label={title.maturityRating}
              sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' }}
              variant="outlined"
            />
          ) : null}
          <Typography variant="caption">
            {[title.year, title.durationLabel, title.genres?.join(' · ')]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Stack>

        <Typography variant="body2" sx={{ opacity: 0.9 }} aria-hidden>
          {title.logline}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={onPlay}
            aria-label={`${title.resumeLabel ?? 'Play'} ${title.title}`}
          >
            {title.resumeLabel ?? 'Play'}
          </Button>

          {onMoreInfo ? (
            <Button
              variant="outlined"
              startIcon={<InfoOutlinedIcon />}
              onClick={onMoreInfo}
              aria-label={`More information about ${title.title}`}
              sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              More info
            </Button>
          ) : null}

          {onToggleWatchlist ? (
            <WatchlistToggle
              contentId={title.id}
              title={title.title}
              inWatchlist={title.inWatchlist ?? false}
              onToggle={onToggleWatchlist}
            />
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
