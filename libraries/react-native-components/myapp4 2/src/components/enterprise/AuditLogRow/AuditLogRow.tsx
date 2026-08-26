import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, DataTable, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { AuditAction, AuditLogEvent, AuditSeverity } from '../types/domain';

const ACTION_LABEL: Record<AuditAction, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  approved: 'approved',
  rejected: 'rejected',
  exported: 'exported',
  permissionChanged: 'changed permissions for',
};

const SEVERITY_META: Record<AuditSeverity, { icon: string; colorKey: 'auditNormal' | 'auditSecurity' | 'auditCritical' }> = {
  normal: { icon: 'information-outline', colorKey: 'auditNormal' },
  security: { icon: 'shield-alert-outline', colorKey: 'auditSecurity' },
  critical: { icon: 'alert-octagon-outline', colorKey: 'auditCritical' },
};

export interface AuditLogRowProps extends StyleEscapeHatches {
  event: AuditLogEvent;
  expandable?: boolean;
  onPress?: (event: AuditLogEvent) => void;
  onCopyEventId?: (event: AuditLogEvent) => void;
}

/**
 * Renders as one coherent sentence — actor, action, object, timestamp — so
 * "Maya approved request PR-1042" is legible without decoding table columns.
 * Critical change details are never hidden inside colour alone, and a
 * redacted field says so in text rather than showing an empty cell.
 */
export const AuditLogRow = ({ event, expandable = true, onPress, onCopyEventId, style, containerStyle, testID }: AuditLogRowProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `audit-${event.id}`;
  const [detailOpen, setDetailOpen] = useState(false);
  const severity = SEVERITY_META[event.severity ?? 'normal'];

  const sentence = `${event.actor?.name ?? 'System'} ${ACTION_LABEL[event.action]} ${event.entityType} "${event.entityLabel}"`;
  const timeLabel = new Date(event.timestamp).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  const handlePress = () => {
    onPress?.(event);
    if (expandable && event.changes && event.changes.length > 0) setDetailOpen(true);
  };

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple onPress={onPress || expandable ? handlePress : undefined} disabled={!onPress && !expandable} accessibilityRole={onPress || expandable ? 'button' : 'text'} accessibilityLabel={`${sentence}, ${timeLabel}${event.severity && event.severity !== 'normal' ? `, ${event.severity}` : ''}`}>
        <View style={styles.row}>
          {event.actor ? (
            event.actor.avatar?.uri ? (
              <Avatar.Image size={28} source={{ uri: event.actor.avatar.uri }} />
            ) : (
              <Avatar.Text size={28} label={initialsOf(event.actor.name)} />
            )
          ) : (
            <View style={[styles.systemIcon, { backgroundColor: enterprise.colors.surfaceVariant }]}>
              <Icon source="robot-outline" size={14} color={enterprise.colors.onSurfaceVariant} />
            </View>
          )}

          <View style={[styles.flex, { marginLeft: 8 }]}>
            <Text variant="bodySmall" numberOfLines={2}>
              {sentence}
            </Text>
            <View style={styles.metaRow}>
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
                {timeLabel}
                {event.timezoneLabel ? ` (${event.timezoneLabel})` : ''}
              </Text>
              {event.severity && event.severity !== 'normal' ? (
                <View style={[styles.row, { marginLeft: 8 }]}>
                  <Icon source={severity.icon} size={11} color={enterprise.colors[severity.colorKey]} />
                  <Text variant="labelSmall" style={{ color: enterprise.colors[severity.colorKey], marginLeft: 2 }}>
                    {event.severity}
                  </Text>
                </View>
              ) : null}
              {event.source ? (
                <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginLeft: 8 }}>
                  {event.source}
                </Text>
              ) : null}
            </View>
          </View>

          {event.changes && event.changes.length > 0 ? <Icon source="chevron-right" size={16} color={enterprise.colors.onSurfaceVariant} /> : null}
        </View>
      </TouchableRipple>

      <AppSheet visible={detailOpen} onDismiss={() => setDetailOpen(false)} variant="bottom" title="Event details" testID={childTestID(id, 'detail-sheet')}>
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
          <Text variant="bodyMedium">{sentence}</Text>
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            {timeLabel}
            {event.timezoneLabel ? ` (${event.timezoneLabel})` : ''}
            {event.ipOrDeviceLabel ? ` · ${event.ipOrDeviceLabel}` : ''}
          </Text>

          {event.changes && event.changes.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Field</DataTable.Title>
                <DataTable.Title>Before</DataTable.Title>
                <DataTable.Title>After</DataTable.Title>
              </DataTable.Header>
              {event.changes.map((change) => (
                <DataTable.Row key={change.field}>
                  <DataTable.Cell>{change.field}</DataTable.Cell>
                  <DataTable.Cell>{change.redacted ? 'Hidden' : (change.before ?? '—')}</DataTable.Cell>
                  <DataTable.Cell>{change.redacted ? 'Hidden' : (change.after ?? '—')}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          ) : null}

          {event.changes?.some((c) => c.redacted) ? (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              Some values are hidden due to permissions.
            </Text>
          ) : null}

          {onCopyEventId ? (
            <Text variant="labelMedium" onPress={() => onCopyEventId(event)} accessibilityRole="button" style={{ color: theme.colors.primary }} testID={childTestID(id, 'copy-id')}>
              Copy event ID
            </Text>
          ) : null}
        </View>
      </AppSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  systemIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
});
