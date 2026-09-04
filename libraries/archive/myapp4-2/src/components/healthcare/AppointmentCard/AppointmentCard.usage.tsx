/**
 * USAGE — AppointmentCard
 *
 * Grouped the way a patient portal actually lists them. Note that "Today" gets
 * a calm emphasis (a tinted surface), not an alarm colour.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Appointment } from '../types/domain';
import { AppointmentCard } from './AppointmentCard';
import sample from './AppointmentCard.sample.json';

const { appointments } = loadSample<{ appointments: Appointment[] }>(sample);

const PAST = new Set(['completed', 'canceled', 'noShow']);

export const AppointmentCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const visible = useMemo(
    () => appointments.filter((item) => (tab === 'past' ? PAST.has(item.status) : !PAST.has(item.status))),
    [tab],
  );

  const cancel = async (appointment: Appointment) => {
    const ok = await confirm({
      title: 'Cancel this appointment?',
      message: `${appointment.clinician.name} · ${new Date(appointment.start).toLocaleString()}`,
      confirmLabel: 'Cancel appointment',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (ok) toast.show('Appointment canceled');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={tab}
        onValueChange={(next) => setTab(next as 'upcoming' | 'past')}
        buttons={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        The cardiology visit needs eCheck-in first, so it shows "Complete check-in" rather than a join button.
      </Text>

      {visible.map((appointment, index) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          index={index}
          entering="slideUp"
          isToday={appointment.start.startsWith('2026-08-19')}
          onPress={() => toast.show('Opening appointment details')}
          onJoin={() => toast.success('Entering the waiting room')}
          onCheckIn={() => toast.show('Starting eCheck-in')}
          onAddToCalendar={() => toast.success('Added to your calendar')}
          actions={
            PAST.has(appointment.status)
              ? [{ key: 'summary', label: 'View summary', icon: 'file-document-outline', onPress: () => toast.show('Opening summary') }]
              : [
                  { key: 'reschedule', label: 'Reschedule', icon: 'calendar-refresh-outline', onPress: () => toast.show('Choose a new time') },
                  { key: 'cancel', label: 'Cancel', icon: 'close', destructive: true, onPress: () => void cancel(appointment) },
                ]
          }
        />
      ))}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
