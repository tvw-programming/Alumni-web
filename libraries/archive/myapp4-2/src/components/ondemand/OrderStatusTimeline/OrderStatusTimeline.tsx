import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { OrderStatusStep, OrderStepStatus } from '../types/domain';

const STEP_ICON: Record<OrderStepStatus, string> = {
  upcoming: 'circle-outline',
  current: 'progress-clock',
  complete: 'check-circle',
  delayed: 'clock-alert-outline',
  failed: 'close-circle',
  canceled: 'cancel',
};

export interface OrderStatusTimelineProps extends StyleEscapeHatches {
  steps: OrderStatusStep[];
  lastUpdatedLabel?: string;
  stale?: boolean;
}

/**
 * A vertical stepper with ordered-list semantics and exactly one dominant
 * "current" step. Delayed/failed/canceled states are inserted inline where
 * the step sits — they never replace the whole timeline with an error screen.
 *
 * When `stale` is true we never render a ticking countdown; a stale ETA is
 * replaced with an honest "Last updated" timestamp instead, per policy.
 */
export const OrderStatusTimeline = ({ steps, lastUpdatedLabel, stale = false, style, containerStyle, testID }: OrderStatusTimelineProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'order-status-timeline';

  return (
    <View
      style={[containerStyle, style]}
      testID={id}
      accessibilityRole="list"
      accessible={false}
    >
      {stale && lastUpdatedLabel ? (
        <View style={[styles.staleBanner, { backgroundColor: service.colors.statusStale, borderRadius: theme.radii.sm, padding: theme.spacing.xs }]}>
          <Icon source="clock-alert-outline" size={13} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
            Status may be delayed · Last updated {lastUpdatedLabel}
          </Text>
        </View>
      ) : null}

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const color =
          step.status === 'complete'
            ? service.colors.availableNow
            : step.status === 'current'
              ? service.colors.statusAssigned
              : step.status === 'delayed'
                ? service.colors.statusDelayed
                : step.status === 'failed' || step.status === 'canceled'
                  ? service.colors.statusFailed
                  : theme.colors.outlineVariant;

        return (
          <View
            key={step.id}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`${index + 1} of ${steps.length}: ${step.label}, ${step.status}${step.timestamp ? `, ${step.timestamp}` : ''}`}
            testID={childTestID(id, step.id)}
          >
            <View style={styles.railColumn}>
              <Icon source={STEP_ICON[step.status]} size={20} color={color} />
              {!isLast ? (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: step.status === 'complete' ? service.colors.availableNow : theme.colors.outlineVariant },
                  ]}
                />
              ) : null}
            </View>
            <View style={[styles.flex, { paddingBottom: isLast ? 0 : theme.spacing.md }]}>
              <Text
                variant={step.status === 'current' ? 'titleSmall' : 'bodyMedium'}
                style={{ color: step.status === 'upcoming' ? theme.colors.onSurfaceVariant : theme.colors.onSurface }}
              >
                {step.label}
              </Text>
              {step.description ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {step.description}
                </Text>
              ) : null}
              {step.timestamp ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {step.timestamp}
                </Text>
              ) : null}
              {step.actionLabel && step.onAction ? (
                <TouchableRipple
                  onPress={step.onAction}
                  borderless
                  accessibilityRole="button"
                  accessibilityLabel={step.actionLabel}
                  style={{ marginTop: 4, alignSelf: 'flex-start' }}
                  testID={childTestID(id, `${step.id}-action`)}
                >
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    {step.actionLabel}
                  </Text>
                </TouchableRipple>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  railColumn: { alignItems: 'center', width: 24 },
  connector: { width: 2, flex: 1, marginTop: 4, minHeight: 24 },
  flex: { flex: 1, marginLeft: 12 },
  staleBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
});
