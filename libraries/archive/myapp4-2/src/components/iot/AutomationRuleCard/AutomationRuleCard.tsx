import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Switch, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { AutomationRule, AutomationStatus } from '../types/domain';

export interface AutomationRuleCardProps extends StyleEscapeHatches {
  rule: AutomationRule;
  onToggle: (rule: AutomationRule, enabled: boolean) => Promise<void> | void;
  onEdit: (rule: AutomationRule) => void;
  onRunNow?: (rule: AutomationRule) => void;
  onMore?: (rule: AutomationRule) => void;
}

const STATUS_META: Record<AutomationStatus, { label: string; icon: string; colorKey: 'online' | 'offline' | 'error' | 'pending' }> = {
  active: { label: 'Active', icon: 'check-circle-outline', colorKey: 'online' },
  paused: { label: 'Paused', icon: 'pause-circle-outline', colorKey: 'offline' },
  error: { label: "Couldn't run", icon: 'alert-circle-outline', colorKey: 'error' },
  neverRun: { label: 'Never run', icon: 'circle-outline', colorKey: 'pending' },
};

/**
 * Trigger, condition, and action always render as plain-language sentences —
 * never raw if-this-then-that syntax. Toggling is optimistic on local state
 * only; if the caller's promise rejects, the switch rolls back and a
 * `syncError` becomes visible rather than the state silently reverting.
 */
export const AutomationRuleCard = ({ rule, onToggle, onEdit, onRunNow, onMore, style, containerStyle, testID }: AutomationRuleCardProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `automation-${rule.id}`;
  const [enabled, setEnabled] = useState(rule.enabled);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const meta = STATUS_META[rule.status];

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setSyncError(false);
    setBusy(true);
    try {
      await onToggle(rule, next);
    } catch {
      setEnabled(!next);
      setSyncError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.xs }}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="titleSmall">{rule.name}</Text>
            <View style={styles.row}>
              <Icon source={meta.icon} size={12} color={iot.colors[meta.colorKey]} />
              <Text variant="labelSmall" style={{ color: iot.colors[meta.colorKey], marginLeft: 4 }}>
                {meta.label}
                {rule.lastRunAt ? ` · Last ran ${rule.lastRunAt}` : ''}
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={busy}
            accessibilityRole="switch"
            accessibilityLabel={`${rule.name}, automation ${enabled ? 'enabled' : 'disabled'}`}
            testID={childTestID(id, 'toggle')}
          />
        </View>

        {syncError ? (
          <View style={styles.row}>
            <Icon source="alert-outline" size={12} color={iot.colors.error} />
            <Text variant="labelSmall" style={{ color: iot.colors.error, marginLeft: 4 }}>
              Change didn't save. Try again.
            </Text>
          </View>
        ) : null}

        <View style={[styles.summaryBlock, { backgroundColor: iot.colors.surfaceVariant, borderRadius: theme.radii.md }]}>
          <SummaryLine icon="lightning-bolt-outline" text={rule.triggerSummary} />
          {rule.conditionSummary ? <SummaryLine icon="filter-outline" text={rule.conditionSummary} /> : null}
          <SummaryLine icon="arrow-right-thin" text={rule.actionSummary} />
        </View>

        <View style={styles.row}>
          <IconButton icon="pencil-outline" size={16} onPress={() => onEdit(rule)} accessibilityLabel={`Edit ${rule.name}`} style={styles.noMargin} testID={childTestID(id, 'edit')} />
          {onRunNow ? <IconButton icon="play-circle-outline" size={16} onPress={() => onRunNow(rule)} accessibilityLabel={`Run ${rule.name} now`} style={styles.noMargin} testID={childTestID(id, 'run')} /> : null}
          {onMore ? <IconButton icon="dots-vertical" size={16} onPress={() => onMore(rule)} accessibilityLabel="More options" style={styles.noMargin} testID={childTestID(id, 'more')} /> : null}
        </View>
      </View>
    </AppCard>
  );
};

const SummaryLine = ({ icon, text }: { icon: string; text: string }) => {
  const iot = useSmartHomeTheme();
  return (
    <View style={[styles.row, { marginVertical: 2 }]}>
      <Icon source={icon} size={13} color={iot.colors.onSurfaceVariant} />
      <Text variant="bodySmall" style={{ marginLeft: 6, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  summaryBlock: { padding: 10 },
  noMargin: { margin: 0 },
});
