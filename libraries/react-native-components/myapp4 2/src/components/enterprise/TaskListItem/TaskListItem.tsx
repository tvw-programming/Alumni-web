import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Checkbox, Icon, IconButton, Menu, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { TaskPriority, WorkspaceTask } from '../types/domain';

const PRIORITY_META: Partial<Record<TaskPriority, { label: string; icon: string; colorKey: 'priorityUrgent' | 'priorityHigh' | 'priorityMedium' | 'priorityLow' }>> = {
  urgent: { label: 'Urgent priority', icon: 'alert-octagon-outline', colorKey: 'priorityUrgent' },
  high: { label: 'High priority', icon: 'chevron-triple-up', colorKey: 'priorityHigh' },
  medium: { label: 'Medium priority', icon: 'chevron-up', colorKey: 'priorityMedium' },
  low: { label: 'Low priority', icon: 'chevron-down', colorKey: 'priorityLow' },
};

export interface TaskListItemProps extends StyleEscapeHatches {
  task: WorkspaceTask;
  toggling?: boolean;
  onToggle: (task: WorkspaceTask) => void;
  onPress: (task: WorkspaceTask) => void;
  onAssign?: (task: WorkspaceTask) => void;
  onPriorityChange?: (task: WorkspaceTask) => void;
}

const isOverdue = (dueDate?: string) => !!dueDate && new Date(dueDate).getTime() < Date.now();
const isDueSoon = (dueDate?: string) => {
  if (!dueDate) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
};

/**
 * Completion is never communicated by strikethrough alone — the checkbox
 * state, an accessible "completed" announcement, and (optionally) the
 * strikethrough all carry the same fact together. Toggling is optimistic
 * from the caller's perspective; `toggling` renders a distinct in-flight
 * state so a sync failure is never silently reverted with no explanation.
 */
export const TaskListItem = ({ task, toggling = false, onToggle, onPress, onAssign, onPriorityChange, style, containerStyle, testID }: TaskListItemProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `task-${task.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const priorityMeta = task.priority ? PRIORITY_META[task.priority] : undefined;
  const overdue = !task.completed && isOverdue(task.dueDate);
  const dueSoon = !task.completed && isDueSoon(task.dueDate);

  const dueLabel = task.dueDate
    ? overdue
      ? `Overdue by ${Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / 86400000)} day${Math.ceil((Date.now() - new Date(task.dueDate).getTime()) / 86400000) === 1 ? '' : 's'}`
      : dueSoon
        ? 'Due today'
        : new Date(task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : undefined;

  const a11yLabel = `${task.title}, ${task.completed ? 'completed' : 'not completed'}${priorityMeta ? `, ${priorityMeta.label}` : ''}${task.assignee ? `, assigned to ${task.assignee.name}` : ''}${dueLabel ? `, ${dueLabel}` : ''}`;

  return (
    <TouchableRipple onPress={() => onPress(task)} accessibilityRole="button" accessibilityLabel={a11yLabel} disabled={task.locked} style={[containerStyle, style, task.locked ? styles.locked : undefined]} testID={id}>
      <View style={styles.row}>
        <Checkbox
          status={toggling ? 'indeterminate' : task.completed ? 'checked' : 'unchecked'}
          disabled={task.locked || toggling}
          onPress={() => onToggle(task)}
          testID={childTestID(id, 'checkbox')}
        />

        <View style={[styles.flex, { marginLeft: 4 }]}>
          <Text variant="bodyMedium" numberOfLines={2} style={{ textDecorationLine: task.completed ? 'line-through' : 'none', color: task.completed ? enterprise.colors.onSurfaceVariant : theme.colors.onSurface }}>
            {task.title}
          </Text>

          <View style={[styles.metaRow, { gap: 8 }]}>
            {priorityMeta ? (
              <View style={styles.row}>
                <Icon source={priorityMeta.icon} size={12} color={enterprise.colors[priorityMeta.colorKey]} />
                <Text variant="labelSmall" style={{ color: enterprise.colors[priorityMeta.colorKey], marginLeft: 2 }}>
                  {task.priority}
                </Text>
              </View>
            ) : null}
            {dueLabel ? (
              <Text variant="labelSmall" style={{ color: overdue ? theme.colors.error : dueSoon ? enterprise.colors.warning : enterprise.colors.onSurfaceVariant }}>
                {dueLabel}
              </Text>
            ) : null}
            {task.status ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
                {task.status}
              </Text>
            ) : null}
          </View>

          {task.subtaskCount && task.subtaskCount.total > 0 ? (
            <View style={{ marginTop: 4, gap: 2 }}>
              <ProgressBar
                progress={task.subtaskCount.complete / task.subtaskCount.total}
                color={theme.colors.primary}
                style={{ height: 4, borderRadius: 2, backgroundColor: enterprise.colors.surfaceVariant }}
              />
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
                {task.subtaskCount.complete} of {task.subtaskCount.total} subtasks complete
              </Text>
            </View>
          ) : null}

          {task.syncError ? (
            <View style={styles.row}>
              <Icon source="cloud-alert-outline" size={12} color={theme.colors.error} />
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: 3 }}>
                Couldn't sync this change
              </Text>
            </View>
          ) : null}
        </View>

        {task.assignee ? (
          <TouchableRipple onPress={onAssign ? () => onAssign(task) : undefined} disabled={!onAssign} accessibilityRole={onAssign ? 'button' : 'text'} accessibilityLabel={`Assigned to ${task.assignee.name}`} testID={childTestID(id, 'assignee')}>
            {task.assignee.avatar?.uri ? <Avatar.Image size={28} source={{ uri: task.assignee.avatar.uri }} /> : <Avatar.Text size={28} label={initialsOf(task.assignee.name)} />}
          </TouchableRipple>
        ) : onAssign ? (
          <IconButton icon="account-plus-outline" size={18} onPress={() => onAssign(task)} accessibilityLabel="Assign task" style={styles.noMargin} testID={childTestID(id, 'assign')} />
        ) : null}

        {onPriorityChange ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${task.title}`} style={styles.noMargin} testID={childTestID(id, 'menu')} />}
          >
            <Menu.Item onPress={() => { setMenuVisible(false); onPriorityChange(task); }} title="Change priority" leadingIcon="flag-outline" />
          </Menu>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  flex: { flex: 1 },
  locked: { opacity: 0.6 },
  noMargin: { margin: 0 },
});
