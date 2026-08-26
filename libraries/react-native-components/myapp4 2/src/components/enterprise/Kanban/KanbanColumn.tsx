import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { KanbanColumnData, TaskCardData } from '../types/domain';

export interface KanbanColumnProps extends StyleEscapeHatches {
  column: KanbanColumnData;
  loading?: boolean;
  onAdd?: (columnId: string) => void;
  renderCard: (card: TaskCardData) => React.ReactElement;
}

/**
 * The WIP limit is stated as text ("8 of 5 — over limit"), never signalled
 * by colour alone — a column at or over its limit is still fully readable
 * without colour vision.
 */
export const KanbanColumn = ({ column, loading = false, onAdd, renderCard, style, containerStyle, testID }: KanbanColumnProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `kanban-column-${column.id}`;
  const overLimit = column.limit != null && column.cards.length > column.limit;

  return (
    <View style={[styles.root, { width: enterprise.layout.kanbanColumnWidth, backgroundColor: enterprise.colors.surfaceVariant, borderRadius: theme.radii.md }, containerStyle, style]} testID={id}>
      <View style={styles.header}>
        <Text variant="titleSmall" accessibilityRole="header" style={styles.flex} numberOfLines={1}>
          {column.title}
        </Text>
        <Text variant="labelSmall" style={{ color: overLimit ? theme.colors.error : enterprise.colors.onSurfaceVariant }}>
          {column.cards.length}
          {column.limit != null ? ` / ${column.limit}` : ''}
        </Text>
        {onAdd ? <IconButton icon="plus" size={16} onPress={() => onAdd(column.id)} accessibilityLabel={`Add task to ${column.title}`} style={styles.noMargin} testID={childTestID(id, 'add')} /> : null}
      </View>

      {overLimit ? (
        <View style={styles.limitRow}>
          <Icon source="alert-outline" size={12} color={theme.colors.error} />
          <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: 4 }}>
            Column limit reached
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {loading ? (
          <>
            <SkeletonLoader shape="rect" height={80} />
            <SkeletonLoader shape="rect" height={80} />
          </>
        ) : column.cards.length === 0 ? (
          <StateView preset="empty" compact title="No tasks here" />
        ) : (
          column.cards.map((card) => <React.Fragment key={card.id}>{renderCard(card)}</React.Fragment>)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { padding: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 4 },
  flex: { flex: 1 },
  limitRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4 },
  noMargin: { margin: 0 },
});
