/**
 * USAGE — HabitCheckRow
 *
 * The missed day (Aug 18) sits in the row like any other fact — no shaming
 * copy, and the streak count still reflects the days since the protected
 * save, not a silent reset to zero.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { HabitDay } from '../types/domain';
import { HabitCheckRow } from './HabitCheckRow';
import sample from './HabitCheckRow.sample.json';

const initial = loadSample<{ label: string; streakCount: number; days: HabitDay[] }>(sample);

export const HabitCheckRowUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [days, setDays] = useState(initial.days);

  const toggleDay = (date: string) => {
    setDays((prev) => prev.map((d) => (d.date === date ? { ...d, state: d.state === 'complete' ? 'incomplete' : 'complete' } : d)));
    toast.show(`Updated ${new Date(date).toLocaleDateString()}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <HabitCheckRow
        label={initial.label}
        days={days}
        streakCount={initial.streakCount}
        onToggleDay={toggleDay}
        onOpenDetails={() => toast.show('Opening habit details')}
        onAddReminder={() => toast.success('Reminder added')}
      />
    </ScrollView>
  );
};
