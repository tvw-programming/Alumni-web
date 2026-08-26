import List from '@mui/material/List';

import { ExerciseListItem, type Exercise } from './ExerciseListItem';
import sample from './sample.json';

export function ExerciseListItemUsage() {
  const exercise = sample.exercise as Exercise;

  return (
    <List disablePadding>
      <ExerciseListItem
        exercise={exercise}
        onToggle={async (completed) => {
          const response = await fetch(`/api/workouts/current/exercises/${exercise.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed }),
          });
          if (!response.ok) throw await response.json();
        }}
        // The written instructions are the text alternative to the demo GIF.
        onShowInstructions={() => {
          /* open a sheet with exercise.instructions */
        }}
      />
    </List>
  );
}
