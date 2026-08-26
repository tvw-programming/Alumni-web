import List from '@mui/material/List';

import sample from './sample.json';
import { TaskListItem, type Task } from './TaskListItem';

export function TaskListItemUsage() {
  const task = sample.task as unknown as Task;

  return (
    <List disablePadding>
      <TaskListItem
        task={task}
        onPress={() => {
          /* open the task */
        }}
        // Optimistic: the checkbox flips at once and React rolls it back if a
        // permission or conflict rule rejects the write.
        onToggle={async (completed) => {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed }),
          });
          if (!response.ok) throw await response.json();
        }}
      />
    </List>
  );
}
