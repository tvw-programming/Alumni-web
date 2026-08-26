import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Switch, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { DeviceSchedule, ScheduleStatus } from '../types/domain';

export interface ScheduleTimerRowProps extends StyleEscapeHatches {
  schedule: DeviceSchedule;
  onToggle: (schedule: DeviceSchedule, enabled: boolean) => Promise<void> | void;
  onPress?: (schedule: DeviceSchedule) => void;
}

const STATUS_META: Record<ScheduleStatus, { label: string; icon: string; colorKey: 'warning' | 'error' }> = {
  active: { label: '', icon: '', colorKey: 'warning' },
  paused: { label: '', icon: '', colorKey: 'warning' },
  conflict: { label: 'Conflicts with another schedule', icon: 'alert-outline', colorKey: 'warning' },
  error: { label: "Couldn't run last time", icon: 'alert-circle-outline', colorKey: 'error' },
};

/**
 * The accessible label always combines the schedule's name and its live
 * state ("Weekday morning lights, enabled") rather than leaving the switch
 * to speak for itself, and toggling rolls back visibly on rejection instead
 * of silently reverting.
 */
export const ScheduleTimerRow = ({ schedule, onToggle, onPress, style, containerStyle, testID }: ScheduleTimerRowProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `schedule-${schedule.id}`;
  const [enabled, setEnabled] = useState(schedule.enabled);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const statusMeta = schedule.status && schedule.status !== 'active' && schedule.status !== 'paused' ? STATUS_META[schedule.status] : undefined;

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setSyncError(false);
    setBusy(true);
    try {
      await onToggle(schedule, next);
    } catch {
      setEnabled(!next);
      setSyncError(true);
    } finally {
      setBusy(false);
    }
  };

  const label = schedule.label ?? schedule.actionSummary;
  const a11yLabel = `${label}, ${enabled ? 'enabled' : 'disabled'}`;

  return (
    <TouchableRipple onPress={onPress ? () => onPress(schedule) : undefined} disabled={!onPress} style={[styles.row, { borderRadius: theme.radii.sm }, containerStyle, style]} testID={id}>
      <View style={styles.rowInner}>
        <View style={[styles.iconWrap, { backgroundColor: iot.colors.surfaceVariant }]}>
          <Icon source="timer-outline" size={18} color={iot.colors.onSurfaceVariant} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium" accessibilityLabel={a11yLabel}>
            {label}
          </Text>
          <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
            {schedule.days.join(', ')} · {schedule.time}
            {schedule.nextRun ? ` · Next ${schedule.nextRun}` : ''}
          </Text>
          {schedule.label ? (
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }} numberOfLines={1}>
              {schedule.actionSummary}
            </Text>
          ) : null}
          {statusMeta ? (
            <View style={styles.statusRow}>
              <Icon source={statusMeta.icon} size={11} color={iot.colors[statusMeta.colorKey]} />
              <Text variant="labelSmall" style={{ color: iot.colors[statusMeta.colorKey], marginLeft: 4 }}>
                {statusMeta.label}
              </Text>
            </View>
          ) : null}
          {syncError ? (
            <Text variant="labelSmall" style={{ color: iot.colors.error }}>
              Change didn't save. Try again.
            </Text>
          ) : null}
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={busy}
          accessibilityRole="switch"
          accessibilityLabel={a11yLabel}
          testID={childTestID(id, 'toggle')}
        />
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 4 },
  rowInner: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
});
