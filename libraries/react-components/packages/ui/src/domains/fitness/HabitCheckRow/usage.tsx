import List from '@mui/material/List';

import { HabitCheckRow, type Habit } from './HabitCheckRow';
import sample from './sample.json';

export function HabitCheckRowUsage() {
  const habit = sample.habit as Habit;

  return (
    <List disablePadding>
      <HabitCheckRow
        habit={habit}
        onToggleToday={async (done) => {
          const response = await fetch(`/api/habits/${habit.id}/today`, {
            method: done ? 'PUT' : 'DELETE',
          });
          if (!response.ok) throw await response.json();
        }}
      />
    </List>
  );
}
