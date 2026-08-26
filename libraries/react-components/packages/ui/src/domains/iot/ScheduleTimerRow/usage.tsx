import List from '@mui/material/List';

import sample from './sample.json';
import { ScheduleTimerRow, type ScheduleTimer } from './ScheduleTimerRow';

export function ScheduleTimerRowUsage() {
  const timer = sample.timer as ScheduleTimer;

  return (
    <List disablePadding>
      <ScheduleTimerRow
        timer={timer}
        onPress={() => {
          /* open the schedule editor */
        }}
        onToggle={async (enabled) => {
          const response = await fetch(`/api/schedules/${timer.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
          });
          if (!response.ok) throw await response.json();
        }}
      />
    </List>
  );
}
