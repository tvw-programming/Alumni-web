import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { ScheduleTimerRow } from './ScheduleTimerRow';
import sample from './ScheduleTimerRow.sample.json';
import { loadSample } from '../types/sample';
import type { DeviceSchedule } from '../types/domain';

const SCHEDULES = loadSample<{ schedules: DeviceSchedule[] }>(sample).schedules;

export const ScheduleTimerRowUsage = () => {
  const theme = useAppTheme();
  const [schedules, setSchedules] = useState(SCHEDULES);

  const handleToggle = (schedule: DeviceSchedule, enabled: boolean) =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (schedule.id === 'sched-error' && enabled) {
          reject(new Error('device offline'));
          return;
        }
        setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? { ...s, enabled } : s)));
        resolve();
      }, 500);
    });

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {schedules.map((schedule, i) => (
        <View key={schedule.id}>
          <ScheduleTimerRow schedule={schedule} onToggle={handleToggle} onPress={() => {}} />
          {i < schedules.length - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
        </View>
      ))}
    </ScrollView>
  );
};
