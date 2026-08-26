/**
 * USAGE — TaskListItem
 *
 * Toggling shows an indeterminate checkbox mid-flight, and a sync failure
 * (task 4) stays visible as its own state instead of quietly reverting.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { WorkspaceTask } from '../types/domain';
import { TaskListItem } from './TaskListItem';
import sample from './TaskListItem.sample.json';

const { tasks: initial } = loadSample<{ tasks: WorkspaceTask[] }>(sample);

export const TaskListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [tasks, setTasks] = useState(initial);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = (task: WorkspaceTask) => {
    setTogglingId(task.id);
    setTimeout(() => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
      setTogglingId(null);
      toast.show(task.completed ? 'Task reopened' : 'Task completed');
    }, 500);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {tasks.map((task, index) => (
        <React.Fragment key={task.id}>
          <TaskListItem
            task={task}
            toggling={togglingId === task.id}
            onToggle={handleToggle}
            onPress={(item) => toast.show(`Opening ${item.title}`)}
            onAssign={(item) => toast.show(`Assigning ${item.title}`)}
            onPriorityChange={(item) => toast.show(`Changing priority for ${item.title}`)}
          />
          {index < tasks.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
