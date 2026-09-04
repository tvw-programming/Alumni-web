import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { clockLabel, describe, timeLabel } from '../../../foundation';

export interface SleepStage {
  label: string;
  minutes: number;
  colour: string;
}

export interface SleepSummaryCardProps {
  bedtime: string;
  wakeTime: string;
  totalMinutes: number;
  stages: SleepStage[];
  /** The user's own target, when they set one. */
  goalMinutes?: number;
  source?: string;
  updatedAt?: string;
}

function formatDuration(minutes: number): string {
  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`;
}

/**
 * Last night's sleep.
 *
 * Stages are labelled with **minutes**, not only as segments of a bar. A stacked
 * bar in four colours is unreadable to a screen reader and imprecise for
 * everyone — "Deep 1h 12m" is the fact.
 *
 * The card reports and never interprets: no sleep score, no "poor night", no
 * advice. Wellness data is not a diagnosis, and a number that implies one is a
 * number that worries people without helping them.
 */
export function SleepSummaryCard({
  bedtime,
  wakeTime,
  totalMinutes,
  stages,
  goalMinutes,
  source,
  updatedAt,
}: SleepSummaryCardProps) {
  const stageTotal = stages.reduce((sum, stage) => sum + stage.minutes, 0) || 1;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          variant="h5"
          fontWeight={700}
          aria-label={describe(
            `Slept ${formatDuration(totalMinutes)}`,
            `from ${clockLabel(bedtime)} to ${clockLabel(wakeTime)}`,
            goalMinutes ? `goal ${formatDuration(goalMinutes)}` : undefined,
            ...stages.map((stage) => `${stage.label} ${formatDuration(stage.minutes)}`),
            source ? `from ${source}` : undefined,
          )}
        >
          {formatDuration(totalMinutes)}
        </Typography>

        <Typography variant="caption" color="text.secondary" aria-hidden>
          {`${clockLabel(bedtime)} – ${clockLabel(wakeTime)}`}
          {goalMinutes !== undefined ? ` · goal ${formatDuration(goalMinutes)}` : ''}
        </Typography>

        {/* Decorative; the labelled rows below carry the numbers. */}
        <Stack
          direction="row"
          sx={{ mt: 2, height: 10, borderRadius: 5, overflow: 'hidden' }}
          aria-hidden
        >
          {stages.map((stage) => (
            <Box
              key={stage.label}
              sx={{
                width: `${String((stage.minutes / stageTotal) * 100)}%`,
                bgcolor: stage.colour,
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap aria-hidden>
          {stages.map((stage) => (
            <Stack key={stage.label} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.colour }} />
              <Typography variant="caption" color="text.secondary">
                {`${stage.label} ${formatDuration(stage.minutes)}`}
              </Typography>
            </Stack>
          ))}
        </Stack>

        {source || updatedAt ? (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 1.5 }}
            aria-hidden
          >
            {[source ? `From ${source}` : null, updatedAt ? timeLabel(updatedAt) : null]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
