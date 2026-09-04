/**
 * USAGE — AppointmentSlotGrid
 *
 * Demonstrates the core rule: selection is optimistic, booking is not. Confirming
 * re-checks availability first, and the 11:20 slot deliberately fails that check
 * so the conflict state is reachable.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AppointmentSlot, SlotGridState } from '../types/domain';
import { AppointmentSlotGrid, type DateOption } from './AppointmentSlotGrid';
import sample from './AppointmentSlotGrid.sample.json';

const data = loadSample<{
  slots: AppointmentSlot[];
  dates: DateOption[];
  displayTimezone: string;
  durationMinutes: number;
}>(sample);

export const AppointmentSlotGridUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [state, setState] = useState<SlotGridState>('ready');
  const [date, setDate] = useState('2026-08-19');
  const [slotId, setSlotId] = useState<string>();

  /** Re-validate with the scheduling service before committing. */
  const confirm = useCallback(
    async (slot: AppointmentSlot) => {
      setState('booking');
      await new Promise((resolve) => setTimeout(resolve, 900));

      if (slot.id === 'sl-3') {
        setState('conflict');
        setSlotId(undefined);
        return;
      }
      setState('ready');
      toast.success('Appointment booked');
    },
    [toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Pick 11:20 AM and confirm — the scheduling service rejects it, which is what a real race with another patient
        looks like. 21 and 24 August have no availability.
      </Text>

      <AppointmentSlotGrid
        slots={data.slots}
        dates={data.dates}
        selectedDate={date}
        onDateChange={(next) => {
          setDate(next);
          setSlotId(undefined);
          if (state === 'conflict') setState('ready');
        }}
        selectedSlotId={slotId}
        onSlotChange={(slot) => setSlotId(slot.id)}
        state={state}
        displayTimezone={data.displayTimezone}
        durationMinutes={data.durationMinutes}
        onConfirm={(slot) => void confirm(slot)}
        onRefresh={() => toast.show('Refreshing availability')}
        onJoinWaitlist={() => toast.success('Added to the waitlist')}
        testID="slot-grid"
      />

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelLarge">Loading</Text>
        <AppointmentSlotGrid slots={[]} dates={[]} state="loading" testID="slot-grid-loading" />

        <Text variant="labelLarge">Error</Text>
        <AppointmentSlotGrid
          slots={[]}
          dates={[]}
          state="error"
          onRefresh={() => toast.show('Retrying')}
          testID="slot-grid-error"
        />
      </View>
    </ScrollView>
  );
};
