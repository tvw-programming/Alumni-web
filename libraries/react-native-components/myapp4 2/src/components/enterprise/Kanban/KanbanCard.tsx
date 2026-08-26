import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Chip, Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { KanbanColumnData, TaskCardData, TaskPriority } from '../types/domain';

const PRIORITY_ICON: Partial<Record<TaskPriority, string>> = { urgent: 'alert-octagon-outline', high: 'chevron-triple-up', medium: 'chevron-up', low: 'chevron-down' };
const PRIORITY_COLOR_KEY: Partial<Record<TaskPriority, 'priorityUrgent' | 'priorityHigh' | 'priorityMedium' | 'priorityLow'>> = {
  urgent: 'priorityUrgent',
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
};

export interface KanbanCardProps extends StyleEscapeHatches {
  card: TaskCardData;
  columns?: KanbanColumnData[];
  onPress?: (card: TaskCardData) => void;
  onMoveTo?: (cardId: string, toColumnId: string) => void;
}

/**
 * "Move to…" is a real menu, not only a drag gesture — the spec's own
 * guidance that drag-and-drop must never be the sole interaction. Priority
 * always pairs an icon with the word, never a coloured edge alone.
 */
export const KanbanCard = ({ card, columns, onPress, onMoveTo, style, containerStyle, testID }: KanbanCardProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `kanban-card-${card.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const priorityColorKey = card.priority ? PRIORITY_COLOR_KEY[card.priority] : undefined;

  const a11yLabel = `${card.identifier ? `${card.identifier}, ` : ''}${card.title}${card.priority ? `, ${card.priority} priority` : ''}${card.assignees?.length ? `, assigned to ${card.assignees.map((a) => a.name).join(', ')}` : ''}`;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={onPress ? () => onPress(card) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel}>
        <View style={{ gap: 6 }}>
          <View style={styles.row}>
            {card.identifier ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, flex: 1 }}>
                {card.identifier}
              </Text>
            ) : (
              <View style={styles.flex} />
            )}
            {onMoveTo && columns ? (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${card.title}`} style={styles.noMargin} />}
              >
                {columns.map((col) => (
                  <Menu.Item key={col.id} onPress={() => { setMenuVisible(false); onMoveTo(card.id, col.id); }} title={`Move to ${col.title}`} testID={childTestID(id, `move-${col.id}`)} />
                ))}
              </Menu>
            ) : null}
          </View>

          <Text variant="bodyMedium" numberOfLines={3}>
            {card.title}
          </Text>

          {card.labels && card.labels.length > 0 ? (
            <View style={styles.chipRow}>
              {card.labels.slice(0, 3).map((label) => (
                <Chip key={label} compact mode="flat" style={{ backgroundColor: enterprise.colors.surfaceVariant, height: 22 }} textStyle={styles.chipText}>
                  {label}
                </Chip>
              ))}
            </View>
          ) : null}

          {card.checklist && card.checklist.total > 0 ? (
            <View style={styles.row}>
              <Icon source="checkbox-marked-outline" size={12} color={enterprise.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: 3 }}>
                {card.checklist.complete}/{card.checklist.total}
              </Text>
            </View>
          ) : null}

          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={styles.row}>
              {priorityColorKey ? <Icon source={PRIORITY_ICON[card.priority!]!} size={13} color={enterprise.colors[priorityColorKey]} /> : null}
              {card.dueDate ? (
                <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: priorityColorKey ? 4 : 0 }}>
                  {new Date(card.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </Text>
              ) : null}
              {card.attachmentCount ? (
                <View style={[styles.row, { marginLeft: 8 }]}>
                  <Icon source="paperclip" size={12} color={enterprise.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: 2 }}>
                    {card.attachmentCount}
                  </Text>
                </View>
              ) : null}
              {card.commentCount ? (
                <View style={[styles.row, { marginLeft: 8 }]}>
                  <Icon source="comment-outline" size={12} color={enterprise.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: 2 }}>
                    {card.commentCount}
                  </Text>
                </View>
              ) : null}
            </View>

            {card.assignees && card.assignees.length > 0 ? (
              <View style={styles.avatarStack}>
                {card.assignees.slice(0, 3).map((assignee, index) => (
                  <View key={assignee.id} style={[styles.avatarWrap, { marginLeft: index === 0 ? 0 : -8, zIndex: 3 - index }]}>
                    {assignee.avatar?.uri ? <Avatar.Image size={22} source={{ uri: assignee.avatar.uri }} /> : <Avatar.Text size={22} label={initialsOf(assignee.name)} labelStyle={{ fontSize: 9 }} />}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chipText: { fontSize: 10, marginVertical: 0, lineHeight: 12 },
  avatarStack: { flexDirection: 'row' },
  avatarWrap: { borderWidth: 1.5, borderColor: 'transparent', borderRadius: 12 },
  noMargin: { margin: 0 },
});
