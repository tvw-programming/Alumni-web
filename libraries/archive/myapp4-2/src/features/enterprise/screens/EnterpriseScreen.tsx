import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  ApprovalRequestCardUsage,
  AuditLogRowUsage,
  DashboardChartCardUsage,
  DataTableWrapperUsage,
  ExportSheetUsage,
  FileAttachmentItemUsage,
  FilterToolbarUsage,
  KanbanUsage,
  KPIStatCardUsage,
  MultiStepFormWizardUsage,
  NotificationListItemUsage,
  TaskListItemUsage,
  TeamMemberUsage,
  TimelineActivityFeedUsage,
} from '@ui/enterprise';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'data-table', title: 'DataTableWrapper', description: 'Server-owned sort/filter/pagination; mobile card fallback slot', Component: DataTableWrapperUsage },
  { key: 'kpi', title: 'KPIStatCard', description: '"Up" is never assumed good — semantic status drives colour', Component: KPIStatCardUsage },
  { key: 'chart', title: 'DashboardChartCard', description: 'One data model renders bar/line/pie; always ships a text summary', Component: DashboardChartCardUsage },
  { key: 'filters', title: 'FilterToolbar', description: 'Active filters shown as removable chips, not hidden behind a menu', Component: FilterToolbarUsage },
  { key: 'tasks', title: 'TaskListItem', description: 'Completion never relies on strikethrough alone', Component: TaskListItemUsage },
  { key: 'kanban', title: 'KanbanColumn + KanbanCard', description: 'A real "Move to…" menu, never drag-only', Component: KanbanUsage },
  { key: 'approvals', title: 'ApprovalRequestCard', description: 'Reject always requires a reason', Component: ApprovalRequestCardUsage },
  { key: 'activity', title: 'TimelineActivityFeed', description: 'Actor → action → object → timestamp, in that order', Component: TimelineActivityFeedUsage },
  { key: 'team', title: 'UserRoleChip + TeamMemberRow', description: 'Presence and role are always plain text, never a dot alone', Component: TeamMemberUsage },
  { key: 'notifications', title: 'NotificationListItem', description: 'Grouped notifications read as one honest row with a count', Component: NotificationListItemUsage },
  { key: 'files', title: 'FileAttachmentItem', description: 'Download and Remove stay independent tap targets', Component: FileAttachmentItemUsage },
  { key: 'export', title: 'ExportSheet', description: 'Asks for format and scope before generating anything', Component: ExportSheetUsage },
  { key: 'audit', title: 'AuditLogRow', description: 'Reads as one sentence; redacted fields say "Hidden," not blank', Component: AuditLogRowUsage },
  { key: 'wizard', title: 'MultiStepFormWizard', description: '"Step X of Y" is always real text, not just a visual indicator', Component: MultiStepFormWizardUsage },
];

export const EnterpriseScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((item) => item.key === active), [active]);

  if (entry) {
    const { Component } = entry;
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { padding: theme.spacing.md, backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.flex}>
            {entry.title}
          </Text>
          <Text
            variant="labelLarge"
            onPress={() => setActive(null)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Back
          </Text>
        </View>
        <Component />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <StateView
        preset="success"
        compact
        title="Enterprise / B2B / productivity library"
        description="14 components, each with a sample JSON payload and a compiling usage example."
      />

      <AppCard variant="outlined" padded={false}>
        {ENTRIES.map((item, index) => (
          <List.Item
            key={item.key}
            title={item.title}
            description={item.description}
            descriptionNumberOfLines={2}
            onPress={() => setActive(item.key)}
            left={() => (
              <View style={[styles.index, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            )}
            right={() => <List.Icon icon="chevron-right" />}
            testID={`enterprise-entry-${item.key}`}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
