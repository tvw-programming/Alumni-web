/**
 * USAGE — MedicationReminderItem
 *
 * A working daily medication list. Marking a dose taken records the time; the
 * missed dose invites a correction rather than scolding.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MedicationSchedule } from '../types/domain';
import { MedicationReminderItem } from './MedicationReminderItem';
import sample from './MedicationReminderItem.sample.json';

const initial = loadSample<{ medications: MedicationSchedule[] }>(sample).medications;

export const MedicationReminderItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [medications, setMedications] = useState<MedicationSchedule[]>(initial);
  const [notificationsOff, setNotificationsOff] = useState(false);

  const update = useCallback((id: string, patch: Partial<MedicationSchedule>) => {
    setMedications((prev) => prev.map((item) => (item.medicationId === id ? { ...item, ...patch } : item)));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Simulate notification permission denied
        </Text>
        <Switch
          value={notificationsOff}
          onValueChange={setNotificationsOff}
          accessibilityLabel="Simulate notifications disabled"
        />
      </View>

      {medications.map((medication, index) => (
        <MedicationReminderItem
          key={medication.medicationId}
          medication={medication}
          index={index}
          entering="slideUp"
          notificationsDisabled={notificationsOff && medication.status === 'due'}
          onTaken={(item) => {
            update(item.medicationId, { status: 'taken', takenAt: new Date().toISOString() });
            toast.success(`${item.name} marked taken`);
          }}
          onSkip={(item, reason) => {
            update(item.medicationId, { status: 'skipped' });
            toast.show(`Skipped — ${reason}`);
          }}
          onSnooze={(item, minutes) => {
            update(item.medicationId, { status: 'snoozed' });
            toast.show(`Reminding you again in ${minutes} minutes`);
          }}
          onRefill={(item) => toast.success(`Refill requested for ${item.name}`)}
          onDetails={(item) => toast.show(`Opening ${item.name} details`)}
        />
      ))}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
