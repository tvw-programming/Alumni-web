import { asId, type WorkoutId } from '../../../foundation';

import sample from './sample.json';
import { WorkoutCard, type Workout } from './WorkoutCard';

export function WorkoutCardUsage() {
  const workout: Workout = {
    ...(sample.workout as unknown as Workout),
    id: asId<WorkoutId>(sample.workout.id),
  };

  return (
    <WorkoutCard
      workout={workout}
      onStart={() => {
        /* open the workout player at the saved exercise */
      }}
      // Optimistic: it is the user's own log, and it rolls back if the write
      // fails to sync.
      onToggleComplete={async (completed) => {
        const response = await fetch(`/api/workouts/${workout.id}/completion`, {
          method: completed ? 'PUT' : 'DELETE',
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
