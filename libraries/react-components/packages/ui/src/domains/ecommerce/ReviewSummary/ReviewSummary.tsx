import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { countLabel, pluralize } from '../../../foundation';

export interface ReviewSummaryProps {
  average: number;
  total: number;
  /** Count per star, keyed 1–5. Missing keys read as zero. */
  distribution: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
  /** Optional: how many reviews are from confirmed purchases. */
  verifiedCount?: number;
  onSelectRating?: (stars: number) => void;
}

/**
 * Rating average plus the histogram.
 *
 * The histogram matters more than the average: 4.0 from a thousand 4-star
 * reviews and 4.0 from an even split of 1s and 5s are different products, and
 * only the distribution tells them apart.
 *
 * The bars are also a filter when `onSelectRating` is given — which is the one
 * interaction reviewers actually want, and it needs to be reachable by keyboard,
 * so each bar is a real button rather than a clickable div.
 */
export function ReviewSummary({
  average,
  total,
  distribution,
  verifiedCount,
  onSelectRating,
}: ReviewSummaryProps) {
  const stars: (5 | 4 | 3 | 2 | 1)[] = [5, 4, 3, 2, 1];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ textAlign: 'center', minWidth: 88 }}>
          <Typography variant="h4" fontWeight={700} aria-hidden>
            {average.toFixed(1)}
          </Typography>
          <Rating value={average} precision={0.1} readOnly size="small" aria-hidden />
          <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
            {pluralize(total, 'review')}
          </Typography>
        </Box>

        {/* One sentence carries the whole block; the visuals above are hidden
            so it is not read three times. */}
        <Typography sx={hidden}>
          {`Rated ${average.toFixed(1)} out of 5, from ${pluralize(total, 'review')}${
            verifiedCount !== undefined
              ? `, ${countLabel(verifiedCount)} from verified purchases`
              : ''
          }`}
        </Typography>

        <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
          {stars.map((star) => {
            const count = distribution[star] ?? 0;
            const percent = total === 0 ? 0 : Math.round((count / total) * 100);
            const label = `${String(star)} star, ${pluralize(count, 'review')}, ${String(percent)} percent`;

            const bar = (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                <Stack direction="row" spacing={0.25} alignItems="center" sx={{ minWidth: 34 }}>
                  <Typography variant="caption">{star}</Typography>
                  <StarIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 36, textAlign: 'right' }}
                >
                  {countLabel(count)}
                </Typography>
              </Stack>
            );

            return onSelectRating ? (
              <Box
                key={star}
                component="button"
                type="button"
                aria-label={`Show only ${label}`}
                onClick={() => {
                  onSelectRating(star);
                }}
                sx={{
                  display: 'flex',
                  width: '100%',
                  border: 0,
                  background: 'none',
                  p: 0.25,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                }}
              >
                {bar}
              </Box>
            ) : (
              <Box key={star} aria-label={label} sx={{ display: 'flex', p: 0.25 }}>
                {bar}
              </Box>
            );
          })}
        </Stack>
      </Stack>

      {verifiedCount !== undefined ? (
        <Typography variant="caption" color="text.secondary" aria-hidden>
          {`${countLabel(verifiedCount)} from verified purchases`}
        </Typography>
      ) : null}
    </Stack>
  );
}

const hidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
