/**
 * USAGE — SlotBookingCalendar
 *
 * 22 August has zero availability and stays visible with a "None" count rather
 * than disappearing from the strip — a missing tile reads as a bug.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CalendarDate, TimeSlot } from '../types/domain';
import { SlotBookingCalendar } from './SlotBookingCalendar';
import sample from './SlotBookingCalendar.sample.json';

const data = loadSample<{ dates: CalendarDate[]; slotsByDate: Record<string, TimeSlot[]>; displayTimezone: string }>(sample);

export const SlotBookingCalendarUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [date, setDate] = useState('2026-08-20');
  const [slotId, setSlotId] = useState<string>();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        The 10:30 slot on the first day is "held" — someone else is mid-checkout. 22 August has no availability and
        stays on the strip with a visible "None" rather than vanishing.
      </Text>

      <SlotBookingCalendar
        dates={data.dates}
        slotsByDate={data.slotsByDate}
        selectedDate={date}
        onDateChange={setDate}
        selectedSlotId={slotId}
        onSlotChange={(id) => {
          setSlotId(id);
          toast.success('Time selected');
        }}
        displayTimezone={data.displayTimezone}
        onJoinWaitlist={() => toast.success('Added to the waitlist')}
        onRefresh={() => toast.show('Refreshing availability')}
        testID="slot-calendar"
      />

      <Text variant="labelLarge">Loading</Text>
      <SlotBookingCalendar dates={[]} slotsByDate={{}} loading onDateChange={() => {}} onSlotChange={() => {}} testID="slot-calendar-loading" />
    </ScrollView>
  );
};
