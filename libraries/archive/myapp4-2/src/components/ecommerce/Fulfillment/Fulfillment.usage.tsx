/**
 * USAGE — DeliverySlotPicker + OrderTrackerTimeline
 *
 * The tracker shows two shipments: one healthy grocery order needing a
 * replacement decision, one delayed parcel where the countdown is replaced by an
 * explanation and a next-update time.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { DeliverySlot } from '../types/domain';
import { DeliverySlotPicker } from './DeliverySlotPicker';
import { OrderTrackerTimeline, type Shipment } from './OrderTrackerTimeline';
import sample from './Fulfillment.sample.json';

const data = loadSample<{ slots: DeliverySlot[]; shipments: Shipment[] }>(sample);

export const FulfillmentUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [slotId, setSlotId] = useState('s-now');
  const [shipmentId, setShipmentId] = useState('ship-1');

  /** Actions are injected by the screen; the timeline only renders them. */
  const shipments = data.shipments.map((shipment) => ({
    ...shipment,
    events: shipment.events.map((event) =>
      event.status === 'shopping' && event.current
        ? { ...event, action: { label: 'Choose a replacement', onPress: () => toast.show('Opening replacements') } }
        : event,
    ),
  }));

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelLarge">DeliverySlotPicker</Text>
      <DeliverySlotPicker
        slots={data.slots}
        value={slotId}
        onChange={(slot) => {
          setSlotId(slot.id);
          toast.success(`Slot selected: ${slot.label ?? `${slot.startTime}–${slot.endTime}`}`);
        }}
        blockedReason="Add ₹150 more to qualify for free delivery on the 8–10 am slot."
        onRefresh={() => toast.show('Refreshing slots')}
        testID="slot-picker"
      />

      <Text variant="labelLarge">OrderTrackerTimeline — split order</Text>
      <OrderTrackerTimeline
        shipments={shipments}
        activeShipmentId={shipmentId}
        onShipmentChange={setShipmentId}
        liveSlot={
          shipmentId === 'ship-1' ? (
            <AppCard variant="outlined" title="Live map">
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                A map or courier card slots in here only when it is genuinely relevant — not on every status.
              </Text>
            </AppCard>
          ) : null
        }
        testID="order-tracker"
      />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
