import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, timeLabel, useOptimisticValue } from '../../../foundation';

export interface KPIStatCardProps {
  label: string;
  /** Already formatted. This component does no arithmetic. */
  value: string;
  comparison?: {
    deltaLabel: string;
    direction: 'up' | 'down' | 'flat';
    /** Whether "up" is good. Churn going up is not a win. */
    upIsGood?: boolean;
    periodLabel: string;
  };
  sparkline?: number[];
  updatedAt?: string;
  loading?: boolean;
  pinned?: boolean;
  onTogglePin?: (next: boolean) => Promise<void>;
  onPress?: () => void;
}

/**
 * A single metric.
 *
 * `upIsGood` exists because direction is not sentiment: revenue up is green,
 * churn up is red, and a component that colours every arrow the same way tells
 * half its users the opposite of the truth.
 *
 * The value is **never optimistic** — metrics are authoritative. Pinning is,
 * because that is the user's own layout preference.
 */
export const KPIStatCard = memo(function KPIStatCard({
  label,
  value,
  comparison,
  sparkline,
  updatedAt,
  loading = false,
  pinned = false,
  onTogglePin,
  onPress,
}: KPIStatCardProps) {
  const [optimisticPinned, togglePin, pinPending] = useOptimisticValue(pinned, async (next) => {
    await onTogglePin?.(next);
  });

  const upIsGood = comparison?.upIsGood ?? true;
  const good =
    comparison === undefined || comparison.direction === 'flat'
      ? undefined
      : (comparison.direction === 'up') === upIsGood;

  const TrendIcon =
    comparison?.direction === 'up'
      ? TrendingUpIcon
      : comparison?.direction === 'down'
        ? TrendingDownIcon
        : TrendingFlatIcon;

  return (
    <Card
      variant="outlined"
      onClick={onPress}
      sx={{ cursor: onPress ? 'pointer' : 'default', height: '100%' }}
      aria-label={describe(
        label,
        loading ? 'loading' : value,
        comparison && `${comparison.deltaLabel} ${comparison.direction} ${comparison.periodLabel}`,
        updatedAt && `updated ${timeLabel(updatedAt)}`,
      )}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" aria-hidden>
            {label}
          </Typography>
          {onTogglePin ? (
            <IconButton
              size="small"
              aria-label={optimisticPinned ? `Unpin ${label}` : `Pin ${label}`}
              aria-pressed={optimisticPinned}
              disabled={pinPending}
              onClick={(event) => {
                event.stopPropagation();
                togglePin(!optimisticPinned);
              }}
            >
              {optimisticPinned ? (
                <PushPinIcon fontSize="small" color="primary" />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          ) : null}
        </Stack>

        {loading ? (
          <Skeleton variant="text" width="60%" height={44} />
        ) : (
          <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }} aria-hidden>
            {value}
          </Typography>
        )}

        {comparison && !loading ? (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} aria-hidden>
            <TrendIcon
              fontSize="small"
              sx={{
                color: good === undefined ? 'text.secondary' : good ? 'success.main' : 'error.main',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: good === undefined ? 'text.secondary' : good ? 'success.main' : 'error.main',
              }}
            >
              {comparison.deltaLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comparison.periodLabel}
            </Typography>
          </Stack>
        ) : null}

        {sparkline?.length ? <Sparkline values={sparkline} /> : null}

        {updatedAt ? (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 1 }}
            aria-hidden
          >
            {`Updated ${timeLabel(updatedAt)}`}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
});

/**
 * A decorative sparkline.
 *
 * `aria-hidden`, because the card's label already carries the number and the
 * trend in words. A chart that is announced as "graphic" adds nothing; the
 * text summary is the accessible version, and it is above.
 */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / span) * 100;
      return `${String(x)},${String(y)}`;
    })
    .join(' ');

  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      sx={{ width: '100%', height: 36, mt: 1, overflow: 'visible' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        opacity={0.6}
      />
    </Box>
  );
}
