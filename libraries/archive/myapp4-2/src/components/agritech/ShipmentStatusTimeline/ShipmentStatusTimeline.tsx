import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { ShipmentEvent, ShipmentEventState } from '../types/domain';

export interface ShipmentStatusTimelineProps extends StyleEscapeHatches {
  events: ShipmentEvent[];
  currentStatus: string;
  onEventPress?: (eventId: string) => void;
  onSupport?: () => void;
}

const STATE_META: Record<ShipmentEventState, { icon: string; colorKey: 'shipmentDelivered' | 'shipmentInTransit' | 'offline' | 'shipmentException' }> = {
  completed: { icon: 'check-circle', colorKey: 'shipmentDelivered' },
  current: { icon: 'circle-slice-8', colorKey: 'shipmentInTransit' },
  upcoming: { icon: 'circle-outline', colorKey: 'offline' },
  exception: { icon: 'alert-circle', colorKey: 'shipmentException' },
};

/**
 * An event-based model, not a fixed four-step sequence — scan history is
 * preserved exactly as it happened, including out-of-order or exception
 * events, and each carrier-specific status is mapped to one of the shared
 * semantic states before it reaches this component.
 */
export const ShipmentStatusTimeline = ({ events, currentStatus, onEventPress, onSupport, style, containerStyle, testID }: ShipmentStatusTimelineProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? 'shipment-status-timeline';

  return (
    <View style={[containerStyle, style]} testID={id}>
      <Text variant="labelMedium" style={{ color: agri.colors.onSurfaceVariant, marginBottom: theme.spacing.sm }} accessibilityLiveRegion="polite">
        Current status: {currentStatus}
      </Text>

      {events.map((event, index) => {
        const meta = STATE_META[event.state];
        const isLast = index === events.length - 1;
        return (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.markerCol}>
              <Icon source={meta.icon} size={18} color={agri.colors[meta.colorKey]} />
              {!isLast ? <View style={[styles.line, { backgroundColor: agri.colors.surfaceVariant }]} /> : null}
            </View>
            <TouchableRipple
              onPress={onEventPress ? () => onEventPress(event.id) : undefined}
              disabled={!onEventPress}
              style={[styles.eventBody, isLast ? undefined : { marginBottom: 14 }]}
              testID={childTestID(id, `event-${event.id}`)}
            >
              <View>
                <Text variant="bodyMedium" style={{ fontWeight: event.state === 'current' ? '600' : '400' }}>
                  {event.label}
                </Text>
                {event.location ? (
                  <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                    {event.location}
                  </Text>
                ) : null}
                {event.description ? (
                  <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                    {event.description}
                  </Text>
                ) : null}
                {event.timestamp ? (
                  <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                    {event.timestamp}
                  </Text>
                ) : null}
                {event.state === 'exception' ? (
                  <Text variant="labelSmall" style={{ color: agri.colors.shipmentException }}>
                    Needs attention
                  </Text>
                ) : null}
              </View>
            </TouchableRipple>
          </View>
        );
      })}

      {onSupport ? (
        <AppButton variant="ghost" size="sm" onPress={onSupport} style={{ marginTop: theme.spacing.sm }} testID={childTestID(id, 'support')}>
          Contact support
        </AppButton>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  eventRow: { flexDirection: 'row' },
  markerCol: { alignItems: 'center', width: 24 },
  line: { width: 2, flex: 1, marginTop: 2 },
  eventBody: { flex: 1, marginLeft: 10 },
});
