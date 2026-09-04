/**
 * USAGE — DashboardChartCard
 *
 * Every chart ships an accessible, tappable summary list beneath it — the
 * bar/line/pie rendering is decoration on top of real, readable data rows.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ChartDatum, ChartType } from '../types/domain';
import { DashboardChartCard } from './DashboardChartCard';
import sample from './DashboardChartCard.sample.json';

const data = loadSample<Record<'bar' | 'line' | 'pie' | 'empty', { title: string; subtitle?: string; chartType: ChartType; data: ChartDatum[]; freshnessLabel?: string; rangeOptions?: { value: string; label: string }[] }>>(sample);

export const DashboardChartCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [range, setRange] = useState('3m');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <DashboardChartCard {...data.bar} selectedRange={range} onRangeChange={setRange} onSelectDatum={(datum) => toast.show(`${datum.label}: ${datum.value.toLocaleString()}`)} onViewReport={() => toast.show('Opening full report')} />
      <DashboardChartCard {...data.line} onSelectDatum={(datum) => toast.show(`${datum.label}: ${datum.value.toLocaleString()}`)} />
      <DashboardChartCard {...data.pie} onSelectDatum={(datum) => toast.show(`${datum.label}: ${datum.value}`)} />
      <DashboardChartCard {...data.empty} />
      <DashboardChartCard title="Loading example" chartType="bar" data={[]} loading />
    </ScrollView>
  );
};
