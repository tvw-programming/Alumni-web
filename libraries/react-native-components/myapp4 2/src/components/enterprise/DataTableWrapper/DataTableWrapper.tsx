import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, DataTable, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { TablePagination, TableSort } from '../types/domain';

export interface DataTableColumn<T> {
  key: string;
  title: string;
  width?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => React.ReactNode;
}

export interface DataTableWrapperProps<T> extends StyleEscapeHatches {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  sort?: TableSort;
  pagination?: TablePagination;
  selectable?: boolean;
  selectedIds?: string[];
  renderMobileRow?: (row: T) => React.ReactNode;
  onSortChange?: (sort: TableSort) => void;
  onPageChange?: (page: number) => void;
  onSelectionChange?: (ids: string[]) => void;
  onRowPress?: (row: T) => void;
}

/**
 * Server-owned sorting, filtering, and pagination — this wrapper never
 * embeds query logic, it only emits `onSortChange`/`onPageChange` intents
 * and renders whatever `rows` it's handed. A `renderMobileRow` slot lets the
 * same normalized rows render as cards when columns can't fit narrow
 * screens, per the spec's mobile-fallback guidance.
 */
export function DataTableWrapper<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  emptyMessage = 'No results.',
  onRetry,
  sort,
  pagination,
  selectable = false,
  selectedIds = [],
  renderMobileRow,
  onSortChange,
  onPageChange,
  onSelectionChange,
  onRowPress,
  style,
  containerStyle,
  testID,
}: DataTableWrapperProps<T>) {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? 'data-table-wrapper';

  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds.includes(rowKey(r)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : rows.map(rowKey));
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(selectedIds.includes(key) ? selectedIds.filter((id) => id !== key) : [...selectedIds, key]);
  };

  const handleSort = (columnKey: string) => {
    if (!onSortChange) return;
    const direction = sort?.key === columnKey && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ key: columnKey, direction });
  };

  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  if (loading) {
    return (
      <View style={[containerStyle, style]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={6} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[containerStyle, style]} testID={childTestID(id, 'error')}>
        <View style={styles.row}>
          <Icon source="alert-circle-outline" size={16} color={theme.colors.error} />
          <Text variant="bodyMedium" style={{ color: theme.colors.error, marginLeft: 6, flex: 1 }}>
            {error}
          </Text>
        </View>
        {onRetry ? (
          <AppButton variant="secondary" size="sm" onPress={onRetry} containerStyle={{ marginTop: theme.spacing.sm, alignSelf: 'flex-start' }}>
            Retry
          </AppButton>
        ) : null}
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={[containerStyle, style]} testID={childTestID(id, 'empty')}>
        <StateView preset="empty" compact title={emptyMessage} />
      </View>
    );
  }

  // Mobile card fallback for narrow screens / caller-provided renderer.
  if (renderMobileRow) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        {selectable && onSelectionChange ? (
          <View style={styles.row}>
            <Checkbox status={allSelected ? 'checked' : selectedIds.length > 0 ? 'indeterminate' : 'unchecked'} onPress={toggleAll} />
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
            </Text>
          </View>
        ) : null}
        {rows.map((row) => (
          <React.Fragment key={rowKey(row)}>{renderMobileRow(row)}</React.Fragment>
        ))}
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <DataTable testID={childTestID(id, 'table')}>
          <DataTable.Header>
            {selectable ? (
              <DataTable.Title style={{ width: 44 }}>
                <Checkbox status={allSelected ? 'checked' : selectedIds.length > 0 ? 'indeterminate' : 'unchecked'} onPress={toggleAll} testID={childTestID(id, 'select-all')} />
              </DataTable.Title>
            ) : null}
            {columns.map((col) => (
              <DataTable.Title
                key={col.key}
                style={{ width: col.width ?? 140 }}
                sortDirection={sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                onPress={col.sortable ? () => handleSort(col.key) : undefined}
                numeric={col.align === 'right'}
                testID={childTestID(id, `header-${col.key}`)}
              >
                {col.title}
              </DataTable.Title>
            ))}
          </DataTable.Header>

          {rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedIds.includes(key);
            return (
              <DataTable.Row key={key} onPress={onRowPress ? () => onRowPress(row) : undefined} style={selected ? { backgroundColor: enterprise.colors.selected } : undefined} testID={childTestID(id, `row-${key}`)}>
                {selectable ? (
                  <DataTable.Cell style={{ width: 44 }}>
                    <Checkbox status={selected ? 'checked' : 'unchecked'} onPress={() => toggleRow(key)} testID={childTestID(id, `select-${key}`)} />
                  </DataTable.Cell>
                ) : null}
                {columns.map((col) => (
                  <DataTable.Cell key={col.key} style={{ width: col.width ?? 140 }} numeric={col.align === 'right'} testID={childTestID(id, `cell-${key}-${col.key}`)}>
                    {col.render(row)}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            );
          })}

          {pagination && onPageChange ? (
            <DataTable.Pagination
              page={pagination.page}
              numberOfPages={pageCount}
              onPageChange={onPageChange}
              label={`${pagination.page * pagination.pageSize + 1}-${Math.min(pagination.total, (pagination.page + 1) * pagination.pageSize)} of ${pagination.total}`}
              testID={childTestID(id, 'pagination')}
            />
          ) : null}
        </DataTable>
      </ScrollView>

      {selectable && selectedIds.length > 0 ? (
        <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginTop: 4 }} accessibilityLiveRegion="polite">
          {selectedIds.length} row{selectedIds.length === 1 ? '' : 's'} selected
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
