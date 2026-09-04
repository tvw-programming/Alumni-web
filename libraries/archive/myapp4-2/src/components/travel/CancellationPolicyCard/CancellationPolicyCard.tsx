import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { CancellationPolicy } from '../types/domain';

const TYPE_META: Record<CancellationPolicy['type'], { icon: string; colorKey: 'freeCancellation' | 'partialRefund' | 'nonRefundable' }> = {
  free: { icon: 'calendar-check-outline', colorKey: 'freeCancellation' },
  partialRefund: { icon: 'calendar-clock-outline', colorKey: 'partialRefund' },
  nonRefundable: { icon: 'calendar-remove-outline', colorKey: 'nonRefundable' },
  custom: { icon: 'calendar-alert-outline', colorKey: 'partialRefund' },
};

export interface CancellationPolicyCardProps extends StyleEscapeHatches {
  policy: CancellationPolicy;
  /** Compact summary line only, expandable to full detail and refund rules. */
  defaultExpanded?: boolean;
  onViewFullPolicy?: () => void;
}

/**
 * Deadline, refund consequence and local time zone always render together —
 * "Flexible cancellation" never appears without the date and the number that
 * make it true. Placed close to price so a traveler never has to leave the
 * booking flow to find out what canceling actually costs.
 */
export const CancellationPolicyCard = ({ policy, defaultExpanded = false, onViewFullPolicy, style, containerStyle, testID }: CancellationPolicyCardProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? 'cancellation-policy-card';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const meta = TYPE_META[policy.type];

  const deadlineLabel = policy.deadline
    ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(policy.deadline))
    : undefined;

  return (
    <View
      style={[
        styles.root,
        { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md, backgroundColor: theme.colors.surface },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel={`Cancellation policy: ${policy.summary}`}>
        <View style={[styles.row, { padding: theme.spacing.md }]}>
          <Icon source={meta.icon} size={18} color={travel.colors[meta.colorKey]} />
          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <Text variant="bodyMedium" style={{ color: travel.colors[meta.colorKey] }}>
              {policy.summary}
            </Text>
            {deadlineLabel ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Deadline is in the property's local time ({policy.timezone})
              </Text>
            ) : null}
          </View>
          <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>

      {expanded ? (
        <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, gap: theme.spacing.sm }}>
          {policy.refundRules.length > 0 ? (
            <View style={{ gap: 6 }}>
              {policy.refundRules.map((rule) => (
                <View key={rule.id} style={styles.row} testID={childTestID(id, `rule-${rule.id}`)}>
                  <Icon
                    source={rule.refundPercent === 100 ? 'check-circle-outline' : rule.refundPercent === 0 ? 'close-circle-outline' : 'circle-half-full'}
                    size={14}
                    color={rule.refundPercent === 100 ? travel.colors.freeCancellation : rule.refundPercent === 0 ? travel.colors.nonRefundable : travel.colors.partialRefund}
                  />
                  <Text variant="bodySmall" style={{ marginLeft: 6, flex: 1 }}>
                    {rule.fromLabel}: {rule.refundPercent}% refund{rule.note ? ` — ${rule.note}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {policy.details ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {policy.details}
            </Text>
          ) : null}

          {onViewFullPolicy ? (
            <TouchableRipple onPress={onViewFullPolicy} accessibilityRole="button" accessibilityLabel="View full cancellation policy" testID={childTestID(id, 'full-policy')}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                View full cancellation policy
              </Text>
            </TouchableRipple>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
