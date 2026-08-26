import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { SegmentedTabs } from '@ui/molecules/SegmentedTabs';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { FulfillmentEvent, FulfillmentStatus } from '../types/domain';

const STATUS_ICON: Record<FulfillmentStatus, string> = {
  placed: 'receipt',
  confirmed: 'check-circle-outline',
  preparing: 'package-variant-closed',
  shopping: 'cart-outline',
  packed: 'package-variant',
  pickedUp: 'truck-outline',
  outForDelivery: 'truck-fast-outline',
  delivered: 'home-check-outline',
  delayed: 'clock-alert-outline',
  failed: 'alert-circle-outline',
  canceled: 'close-circle-outline',
};

const EXCEPTION: FulfillmentStatus[] = ['delayed', 'failed', 'canceled'];

export interface Shipment {
  id: string;
  label: string;
  events: FulfillmentEvent[];
  /** ETA as a range plus a freshness stamp — never false precision. */
  eta?: { earliest: string; latest: string; updatedAt: string; confident: boolean };
  courierName?: string;
}

export interface OrderTrackerTimelineProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  shipments: Shipment[];
  activeShipmentId?: string;
  onShipmentChange?: (id: string) => void;
  locale?: string;
  /** Slot for a live map or courier card. */
  liveSlot?: React.ReactNode;
}

/**
 * Fulfilment timeline.
 *
 * Split orders get a switcher rather than two courier states merged into one
 * ambiguous line. When something goes wrong the headline stops being a
 * countdown and becomes an honest explanation plus a next-update time —
 * a ticking clock on a delayed order is worse than no clock.
 */
export const OrderTrackerTimeline = ({
  shipments,
  activeShipmentId,
  onShipmentChange,
  locale = 'en-IN',
  liveSlot,
  animated = true,
  style,
  containerStyle,
  testID,
}: OrderTrackerTimelineProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });

  const active = useMemo(
    () => shipments.find((shipment) => shipment.id === activeShipmentId) ?? shipments[0],
    [activeShipmentId, shipments],
  );

  if (!active) return null;

  const current = active.events.find((event) => event.current);
  const exception = current && EXCEPTION.includes(current.status);

  const formatTime = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(iso)) : '';

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {shipments.length > 1 ? (
        <SegmentedTabs
          items={shipments.map((shipment) => ({ key: shipment.id, label: shipment.label }))}
          value={active.id}
          onChange={(id) => onShipmentChange?.(id)}
          scrollable
          testID={childTestID(testID, 'shipments')}
        />
      ) : null}

      <AppCard variant="filled" entering="fade">
        {exception ? (
          <>
            <View style={[styles.row, { gap: theme.spacing.sm }]}>
              <Icon source={STATUS_ICON[current.status]} size={24} color={shop.colors.timelineException} />
              <Text variant="titleMedium" style={[styles.flex, { color: shop.colors.timelineException }]}>
                {current.label}
              </Text>
            </View>
            {current.description ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {current.description}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {current?.label ?? 'Order update'}
            </Text>
            {active.eta ? (
              <>
                <Text variant="headlineSmall" style={{ marginTop: 2 }}>
                  {active.eta.earliest} – {active.eta.latest}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {/* Freshness and confidence are stated, not implied. */}
                  {active.eta.confident ? 'Estimated arrival' : 'Rough estimate'} · updated {formatTime(active.eta.updatedAt)}
                </Text>
              </>
            ) : null}
          </>
        )}

        {active.courierName ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {active.courierName}
          </Text>
        ) : null}

        {current?.action ? (
          <AppButton
            variant="primary"
            size="sm"
            onPress={current.action.onPress}
            containerStyle={{ marginTop: theme.spacing.sm }}
            testID={childTestID(testID, 'primary-action')}
          >
            {current.action.label}
          </AppButton>
        ) : null}
      </AppCard>

      {liveSlot}

      <View style={{ gap: 0 }} accessibilityRole="list">
        {active.events.map((event, index) => {
          const isException = EXCEPTION.includes(event.status);
          const color = isException
            ? shop.colors.timelineException
            : event.completed
              ? shop.colors.timelineComplete
              : event.current
                ? shop.colors.timelineCurrent
                : shop.colors.timelineUpcoming;

          const last = index === active.events.length - 1;

          return (
            <Animated.View
              key={event.id}
              entering={motion.entering('slideUp', index)}
              style={styles.eventRow}
              accessible
              accessibilityRole="text"
              // Status is spoken as a word, never conveyed by the dot's colour.
              accessibilityLabel={`${event.label}${event.completed ? ', completed' : event.current ? ', in progress' : ', upcoming'}${
                event.timestamp ? `, ${formatTime(event.timestamp)}` : ''
              }${event.description ? `. ${event.description}` : ''}`}
              testID={childTestID(testID, `event-${event.status}`)}
            >
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: event.completed || event.current || isException ? color : 'transparent',
                      borderColor: color,
                      borderRadius: theme.radii.pill,
                    },
                  ]}
                >
                  {event.completed ? <Icon source="check" size={12} color="#FFFFFF" /> : null}
                  {isException && event.current ? <Icon source="exclamation" size={12} color="#FFFFFF" /> : null}
                </View>
                {!last ? <View style={[styles.line, { backgroundColor: event.completed ? color : shop.colors.timelineUpcoming }]} /> : null}
              </View>

              <View style={[styles.eventBody, { paddingBottom: last ? 0 : theme.spacing.md }]}>
                <View style={[styles.row, { gap: theme.spacing.xs }]}>
                  <Icon source={STATUS_ICON[event.status]} size={14} color={color} />
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: event.current || event.completed ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                      fontWeight: event.current ? '600' : '400',
                    }}
                  >
                    {event.label}
                  </Text>
                </View>

                {event.timestamp ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatTime(event.timestamp)}
                  </Text>
                ) : null}

                {event.description ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {event.description}
                  </Text>
                ) : null}

                {event.action && !event.current ? (
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onPress={event.action.onPress}
                    containerStyle={{ marginTop: 4, alignSelf: 'flex-start' }}
                  >
                    {event.action.label}
                  </AppButton>
                ) : null}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  eventRow: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: 32, alignItems: 'center' },
  dot: { width: 18, height: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginVertical: 2 },
  eventBody: { flex: 1, paddingLeft: 4 },
  flex: { flex: 1 },
});
