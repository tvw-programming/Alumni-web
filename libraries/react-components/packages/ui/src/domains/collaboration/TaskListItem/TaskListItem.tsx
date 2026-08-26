import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import {
  describe,
  statusOf,
  timeLabel,
  useOptimisticValue,
  type StatusMap,
  type TaskId,
} from '../../../foundation';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: TaskId;
  title: string;
  completed: boolean;
  status: string;
  priority?: TaskPriority;
  dueDate?: string;
  assignee?: { id: string; name: string; avatarUri?: string };
  subtaskProgress?: { completed: number; total: number };
}

export interface TaskListItemProps {
  task: Task;
  onToggle: (completed: boolean) => Promise<void>;
  onPress: () => void;
}

const PRIORITY: StatusMap<TaskPriority> = {
  none: { label: '', color: 'default' },
  low: { label: 'Low', color: 'default' },
  medium: { label: 'Medium', color: 'info' },
  high: { label: 'High', color: 'warning' },
  urgent: { label: 'Urgent', color: 'error' },
};

/**
 * One task.
 *
 * Completion is optimistic — the user's own decision, instantly reversible, and
 * a checkbox that waits for a round trip is the single most annoying control in
 * any task app. React restores the server's value if the write is rejected by a
 * permission or conflict rule.
 *
 * The overdue state is computed from the due date and stated in words, because
 * a red date is invisible to a screen reader and to a colour-blind user.
 */
export const TaskListItem = memo(function TaskListItem({
  task,
  onToggle,
  onPress,
}: TaskListItemProps) {
  const [completed, toggle, pending] = useOptimisticValue(task.completed, async (next) => {
    await onToggle(next);
  });

  const priority = task.priority ? statusOf(PRIORITY, task.priority) : undefined;
  const overdue = task.dueDate !== undefined && !completed && new Date(task.dueDate) < new Date();

  return (
    <ListItemButton
      onClick={onPress}
      sx={{ alignItems: 'flex-start', gap: 1, py: 1, opacity: pending ? 0.7 : 1 }}
      // The complete sentence: "Prepare quarterly report, incomplete, high
      // priority, due Friday, assigned to Maya."
      aria-label={describe(
        task.title,
        completed ? 'complete' : 'incomplete',
        priority?.label ? `${priority.label} priority` : undefined,
        task.dueDate ? `due ${timeLabel(task.dueDate)}` : undefined,
        overdue ? 'overdue' : undefined,
        task.assignee ? `assigned to ${task.assignee.name}` : 'unassigned',
        task.subtaskProgress
          ? `${String(task.subtaskProgress.completed)} of ${String(task.subtaskProgress.total)} subtasks done`
          : undefined,
      )}
    >
      <Checkbox
        checked={completed}
        disabled={pending}
        sx={{ mt: -0.5 }}
        // Its own label, since the row's label describes the whole task.
        inputProps={{
          'aria-label': completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`,
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onChange={(event) => {
          toggle(event.target.checked);
        }}
      />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          aria-hidden
          sx={{
            textDecoration: completed ? 'line-through' : 'none',
            color: completed ? 'text.secondary' : 'text.primary',
          }}
        >
          {task.title}
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 0.5 }}
        >
          <Chip size="small" variant="outlined" label={task.status} aria-hidden />
          {priority?.label ? (
            <Chip
              size="small"
              color={priority.color}
              variant="outlined"
              label={priority.label}
              aria-hidden
            />
          ) : null}
          {task.dueDate ? (
            <Typography
              variant="caption"
              color={overdue ? 'error.main' : 'text.secondary'}
              aria-hidden
            >
              {overdue ? `Overdue · ${timeLabel(task.dueDate)}` : timeLabel(task.dueDate)}
            </Typography>
          ) : null}
        </Stack>

        {task.subtaskProgress && task.subtaskProgress.total > 0 ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }} aria-hidden>
            <LinearProgress
              variant="determinate"
              value={(task.subtaskProgress.completed / task.subtaskProgress.total) * 100}
              sx={{ flexGrow: 1, height: 4, borderRadius: 2, maxWidth: 120 }}
            />
            <Typography variant="caption" color="text.secondary">
              {`${String(task.subtaskProgress.completed)}/${String(task.subtaskProgress.total)}`}
            </Typography>
          </Stack>
        ) : null}
      </Box>

      {task.assignee ? (
        <Avatar src={task.assignee.avatarUri} alt="" sx={{ width: 26, height: 26, fontSize: 12 }}>
          {task.assignee.name.charAt(0)}
        </Avatar>
      ) : null}
    </ListItemButton>
  );
});
