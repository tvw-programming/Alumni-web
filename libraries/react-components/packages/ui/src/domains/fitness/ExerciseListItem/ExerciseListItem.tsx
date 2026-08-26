import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, useOptimisticValue } from '../../../foundation';

export interface ExerciseSet {
  reps: number;
  weightLabel?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  restSeconds?: number;
  thumbnailUri?: string;
  /** Written instructions. The text alternative to a demo video or GIF. */
  instructions: string;
  completed: boolean;
}

export interface ExerciseListItemProps {
  exercise: Exercise;
  onToggle: (completed: boolean) => Promise<void>;
  onShowInstructions?: () => void;
}

/**
 * One exercise in a workout.
 *
 * `instructions` is a **required string**, because the demo is usually a GIF or
 * a video and neither carries any information to a screen reader — or to anyone
 * with data saving on. A form cue that exists only as animation is a form cue
 * half the users never receive.
 *
 * The set summary is written out — "3 × 10 · 20 kg" — rather than shown as a row
 * of boxes, so it survives being read aloud.
 */
export const ExerciseListItem = memo(function ExerciseListItem({
  exercise,
  onToggle,
  onShowInstructions,
}: ExerciseListItemProps) {
  const [completed, toggle, pending] = useOptimisticValue(exercise.completed, async (next) => {
    await onToggle(next);
  });

  const summary = exercise.sets
    .map((set) => `${String(set.reps)}${set.weightLabel ? ` × ${set.weightLabel}` : ''}`)
    .join(' · ');

  return (
    <ListItemButton
      onClick={() => {
        toggle(!completed);
      }}
      disabled={pending}
      sx={{ gap: 1.5, opacity: completed ? 0.65 : 1 }}
      aria-pressed={completed}
      aria-label={describe(
        exercise.name,
        `${String(exercise.sets.length)} sets`,
        summary,
        exercise.restSeconds ? `${String(exercise.restSeconds)} seconds rest` : undefined,
        completed ? 'done' : 'not done',
      )}
    >
      {completed ? (
        <CheckCircleIcon color="success" />
      ) : (
        <RadioButtonUncheckedIcon color="disabled" />
      )}

      {exercise.thumbnailUri ? (
        <Box
          component="img"
          src={exercise.thumbnailUri}
          alt=""
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1,
            objectFit: 'cover',
            bgcolor: 'action.hover',
          }}
        />
      ) : null}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          aria-hidden
          sx={{ textDecoration: completed ? 'line-through' : 'none' }}
        >
          {exercise.name}
        </Typography>
        {/* Written out, so it survives being read aloud. */}
        <Typography variant="caption" color="text.secondary" aria-hidden>
          {`${String(exercise.sets.length)} sets · ${summary}`}
          {exercise.restSeconds ? ` · ${String(exercise.restSeconds)}s rest` : ''}
        </Typography>
      </Box>

      {onShowInstructions ? (
        <IconButton
          size="small"
          aria-label={`How to do ${exercise.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onShowInstructions();
          }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      ) : null}
    </ListItemButton>
  );
});
