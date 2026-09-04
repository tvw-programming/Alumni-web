import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { countLabel, timeLabel } from '../../../foundation';

export interface ActivityGoal {
  id: string;
  label: string;
  current: number;
  goal: number;
  unit: string;
  colour: string;
}

export interface ActivityRingsProps {
  goals: ActivityGoal[];
  syncedFrom?: string;
  updatedAt?: string;
  /** Rendered when there is no data at all, rather than three empty rings. */
  emptyMessage?: string;
}

/**
 * Concentric progress rings.
 *
 * The rings are `aria-hidden` and every goal is **also** a text row: "8,420 of
 * 10,000 steps · 84%". Rings are the least accessible chart there is — nested
 * arcs distinguished by colour — and the text is the real content, not a
 * fallback.
 *
 * Health data is authoritative: this renders what was synced and never predicts
 * a value. The source and the sync time are shown because a ring that has not
 * updated since this morning is a ring people misread as today's total.
 */
export function ActivityRings({
  goals,
  syncedFrom,
  updatedAt,
  emptyMessage = 'No data yet',
}: ActivityRingsProps) {
  const hasData = goals.some((goal) => goal.current > 0);
  const size = 180;
  const centre = size / 2;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
      <Box
        component="svg"
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        aria-hidden
        sx={{ width: size, height: size }}
      >
        {goals.map((goal, index) => {
          const radius = centre - 12 - index * 22;
          const circumference = 2 * Math.PI * radius;
          const fraction = goal.goal === 0 ? 0 : Math.min(goal.current / goal.goal, 1);

          return (
            <g key={goal.id} transform={`rotate(-90 ${String(centre)} ${String(centre)})`}>
              <circle
                cx={centre}
                cy={centre}
                r={radius}
                fill="none"
                stroke={goal.colour}
                strokeWidth={14}
                opacity={0.2}
              />
              <circle
                cx={centre}
                cy={centre}
                r={radius}
                fill="none"
                stroke={goal.colour}
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={`${String(circumference * fraction)} ${String(circumference)}`}
              />
            </g>
          );
        })}
      </Box>

      <Stack spacing={1} sx={{ minWidth: 200 }}>
        {!hasData ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : (
          goals.map((goal) => {
            const percent = goal.goal === 0 ? 0 : Math.round((goal.current / goal.goal) * 100);
            const complete = goal.current >= goal.goal;

            return (
              <Stack key={goal.id} spacing={0.25}>
                {/* The text is the content, not a fallback. */}
                <Typography variant="body2">
                  {`${goal.label}: ${countLabel(goal.current)} of ${countLabel(goal.goal)} ${goal.unit}`}
                  {complete ? ' · goal complete' : ` · ${String(percent)}%`}
                </Typography>
              </Stack>
            );
          })
        )}

        {syncedFrom ? (
          <Typography variant="caption" color="text.secondary">
            {`Data synced from ${syncedFrom}`}
          </Typography>
        ) : null}
        {updatedAt ? (
          <Typography variant="caption" color="text.secondary">
            {`Last updated ${timeLabel(updatedAt)}`}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
