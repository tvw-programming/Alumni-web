import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRef, type ReactNode } from 'react';

import { pluralize } from '../../../foundation';

export interface ContentCarouselProps {
  title: string;
  itemCount: number;
  loading?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

/**
 * A titled rail.
 *
 * A native scroller with `scroll-snap`, not a transform-based carousel: it
 * keeps momentum scrolling on touch, keyboard tabbing through the items, and
 * the browser's own scrollbar. Arrow buttons scroll it for pointer users and
 * are `aria-hidden`, because keyboard users already have Tab and arrow keys.
 *
 * The rail is a labelled region with its count — *"Trending now, 12 titles"* —
 * so a screen-reader user can skip a rail they do not want rather than tabbing
 * through twelve posters to find out.
 */
export function ContentCarousel({
  title,
  itemCount,
  loading = false,
  emptyMessage = 'Nothing here right now',
  children,
}: ContentCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    scroller.current?.scrollBy({ left: direction * 600, behavior: 'smooth' });
  };

  return (
    <Box
      component="section"
      aria-label={`${title}, ${pluralize(itemCount, 'title')}`}
      sx={{ mb: 3 }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          aria-hidden
          tabIndex={-1}
          onClick={() => {
            scrollBy(-1);
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          size="small"
          aria-hidden
          tabIndex={-1}
          onClick={() => {
            scrollBy(1);
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {loading ? (
        <Stack direction="row" spacing={1.5}>
          {Array.from({ length: 5 }, (_unused, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              width={150}
              height={225}
              sx={{ borderRadius: 1, flexShrink: 0 }}
            />
          ))}
        </Stack>
      ) : itemCount === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      ) : (
        <Stack
          ref={scroller}
          direction="row"
          spacing={1.5}
          sx={{
            overflowX: 'auto',
            pb: 1,
            scrollSnapType: 'x mandatory',
            '& > *': { scrollSnapAlign: 'start' },
            // The scrollbar is left visible: hiding it removes the only cue
            // that there is more to the right.
          }}
        >
          {children}
        </Stack>
      )}
    </Box>
  );
}
