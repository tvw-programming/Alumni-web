/**
 * USAGE — DataTableWrapper
 *
 * Sorting and pagination only ever emit intents (`onSortChange`,
 * `onPageChange`) — this file stands in for the query layer that would
 * actually re-fetch sorted, paginated rows from a server.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { TablePagination, TableSort } from '../types/domain';
import { DataTableWrapper, type DataTableColumn } from './DataTableWrapper';
import sample from './DataTableWrapper.sample.json';

interface Deal {
  id: string;
  name: string;
  owner: string;
  amount: string;
  stage: string;
  closeDate: string;
}

const { rows } = loadSample<{ rows: Deal[] }>(sample);

const COLUMNS: DataTableColumn<Deal>[] = [
  { key: 'name', title: 'Deal', width: 220, sortable: true, render: (row) => <Text variant="bodySmall">{row.name}</Text> },
  { key: 'owner', title: 'Owner', width: 130, sortable: true, render: (row) => <Text variant="bodySmall">{row.owner}</Text> },
  { key: 'amount', title: 'Amount', width: 100, align: 'right', sortable: true, render: (row) => <Text variant="bodySmall">{row.amount}</Text> },
  { key: 'stage', title: 'Stage', width: 140, render: (row) => <Text variant="bodySmall">{row.stage}</Text> },
  { key: 'closeDate', title: 'Close date', width: 110, sortable: true, render: (row) => <Text variant="bodySmall">{row.closeDate}</Text> },
];

export const DataTableWrapperUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [sort, setSort] = useState<TableSort | undefined>(undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [pagination, setPagination] = useState<TablePagination>({ page: 0, pageSize: 3, total: rows.length });

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => String(a[sort.key as keyof Deal]).localeCompare(String(b[sort.key as keyof Deal])) * factor);
  }, [sort]);

  const pageRows = sortedRows.slice(pagination.page * pagination.pageSize, (pagination.page + 1) * pagination.pageSize);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <DataTableWrapper
        columns={COLUMNS}
        rows={pageRows}
        rowKey={(row) => row.id}
        selectable
        selectedIds={selected}
        sort={sort}
        pagination={pagination}
        onSortChange={setSort}
        onSelectionChange={setSelected}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onRowPress={(row) => toast.show(`Opening ${row.name}`)}
      />

      <View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Mobile card fallback
        </Text>
        <DataTableWrapper
          columns={COLUMNS}
          rows={pageRows}
          rowKey={(row) => row.id}
          renderMobileRow={(row) => (
            <View style={{ padding: theme.spacing.sm, borderBottomWidth: 1, borderColor: theme.colors.outlineVariant }}>
              <Text variant="bodyMedium">{row.name}</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {row.owner} · {row.amount} · {row.stage}
              </Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
};
