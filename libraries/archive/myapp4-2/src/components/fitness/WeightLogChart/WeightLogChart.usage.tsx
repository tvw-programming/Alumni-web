/**
 * USAGE — WeightLogChart + LogEntrySheet
 *
 * The trend line reads "Up 0.0 kg" or "Down X kg" — neutral language, never
 * "good" or "bad" — and every plotted point is also listed as an exact,
 * dated value beneath the chart.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ChartRange, WeightEntry, WeightUnit } from '../types/domain';
import { LogEntrySheet } from './LogEntrySheet';
import { WeightLogChart } from './WeightLogChart';
import sample from './WeightLogChart.sample.json';

const initial = loadSample<{ entries: WeightEntry[]; goal: number }>(sample);

export const WeightLogChartUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [entries, setEntries] = useState(initial.entries);
  const [range, setRange] = useState<ChartRange>('30d');
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleSave = (value: number, unit: WeightUnit) => {
    setEntries((prev) => [...prev, { id: `w-${Date.now()}`, value, unit, measuredAt: new Date().toISOString(), source: 'manual' }]);
    setSheetVisible(false);
    toast.success(`Logged ${value} ${unit}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <WeightLogChart
        entries={entries}
        goal={initial.goal}
        range={range}
        onRangeChange={setRange}
        onAddEntry={() => setSheetVisible(true)}
        onEntryPress={(entryId) => toast.show(`Opening entry ${entryId}`)}
      />

      <LogEntrySheet visible={sheetVisible} onDismiss={() => setSheetVisible(false)} onSave={handleSave} />
    </ScrollView>
  );
};
