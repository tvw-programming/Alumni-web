import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, useOptimisticValue, type WorkoutId } from '../../../foundation';

export type WorkoutState = 'notStarted' | 'inProgress' | 'completed' | 'restDay';

export interface Workout {
  id: WorkoutId;
  title: string;
  discipline: string;
  durationLabel: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  exerciseCount: number;
  state: WorkoutState;
  /** 0–100 when resumed part-way. */
  progressPercent?: number;
}

export interface WorkoutCardProps {
  workout: Workout;
  onStart: () => void;
  /** Marking complete without doing it in-app. Optimistic. */
  onToggleComplete?: (completed: boolean) => Promise<void>;
}

/**
 * A workout in a plan or catalogue.
 *
 * **Equipment is on the card.** "Requires: dumbbells, bench" decided at the
 * gym door is useful; discovered at exercise four is a workout abandoned. It is
 * a required field for that reason, with "Bodyweight only" as the honest empty
 * value.
 *
 * A rest day is a state, not an absence. A plan that shows nothing on Wednesday
 * looks broken; "Rest day" is the instruction.
 */
export const WorkoutCard = memo(function WorkoutCard({
  workout,
  onStart,
  onToggleComplete,
}: WorkoutCardProps) {
  const [completed, toggleComplete, pending] = useOptimisticValue(
    workout.state === 'completed',
    async (next) => {
      await onToggleComplete?.(next);
    },
  );

  const rest = workout.state === 'restDay';
  const resumable = workout.state === 'inProgress';

  return (
    <Card variant="outlined" sx={{ opacity: completed || rest ? 0.8 : 1 }}>
      <CardContent>
        <Stack
          spacing={0.5}
          aria-label={describe(
            workout.title,
            workout.discipline,
            workout.durationLabel,
            workout.level,
            `${String(workout.exerciseCount)} exercises`,
            workout.equipment.length > 0
              ? `equipment: ${workout.equipment.join(', ')}`
              : 'bodyweight only',
            completed
              ? 'completed'
              : resumable
                ? `${String(workout.progressPercent ?? 0)} percent done`
                : undefined,
          )}
        >
          <Typography variant="subtitle2" fontWeight={700} aria-hidden>
            {rest ? 'Rest day' : workout.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {rest
              ? 'Recovery is part of the plan.'
              : `${workout.discipline} · ${workout.durationLabel} · ${String(workout.exerciseCount)} exercises`}
          </Typography>
        </Stack>

        {!rest ? (
          <>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ mt: 1 }}
              flexWrap="wrap"
              useFlexGap
              aria-hidden
            >
              <Chip size="small" variant="outlined" label={workout.level} />
              {/* Equipment where it is useful: before starting. */}
              <Chip
                size="small"
                variant="outlined"
                label={
                  workout.equipment.length > 0 ? workout.equipment.join(' · ') : 'Bodyweight only'
                }
              />
            </Stack>

            {resumable && workout.progressPercent !== undefined ? (
              <LinearProgress
                variant="determinate"
                value={workout.progressPercent}
                aria-hidden
                sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
              />
            ) : null}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
              {onToggleComplete ? (
                <Button
                  size="small"
                  color="inherit"
                  disabled={pending}
                  onClick={() => {
                    toggleComplete(!completed);
                  }}
                  aria-pressed={completed}
                >
                  {completed ? 'Completed' : 'Mark done'}
                </Button>
              ) : null}
              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={onStart}
                aria-label={`${resumable ? 'Resume' : 'Start'} ${workout.title}`}
              >
                {resumable ? 'Resume' : 'Start workout'}
              </Button>
            </Stack>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
});
