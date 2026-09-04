import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Icon, SegmentedButtons, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { ChartRange, WeightEntry } from '../types/domain';

const RANGE_LABEL: Record<ChartRange, string> = { '7d': '7D', '30d': '30D', '90d': '90D', '1y': '1Y', all: 'All' };

export interface WeightLogChartProps extends StyleEscapeHatches {
  entries: WeightEntry[];
  goal?: number;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  onAddEntry: () => void;
  onEntryPress?: (entryId: string) => void;
}

/**
 * Never a value judgement — the summary text stays neutral ("Up 0.4 kg this
 * month"), and every point plotted here is also available as an exact,
 * listable value; the chart is a supplement to that list, not a replacement.
 */
export const WeightLogChart = ({ entries, goal, range, onRangeChange, onAddEntry, onEntryPress, style, containerStyle, testID }: WeightLogChartProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'weight-log-chart';

  const sorted = useMemo(() => [...entries].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)), [entries]);
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const trendLabel = useMemo(() => {
    if (!latest || !first || sorted.length < 2) return undefined;
    const delta = latest.value - first.value;
    if (Math.abs(delta) < 0.05) return 'No change over this period';
    return `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(1)} ${latest.unit} this period`;
  }, [latest, first, sorted.length]);

  const chartWidth = 280;
  const chartHeight = 100;
  const padding = 12;

  const points = useMemo(() => {
    if (sorted.length === 0) return [];
    const values = sorted.map((e) => e.value);
    const min = Math.min(...values, goal ?? values[0]!);
    const max = Math.max(...values, goal ?? values[0]!);
    const span = Math.max(0.1, max - min);
    return sorted.map((entry, index) => {
      const x = sorted.length === 1 ? chartWidth / 2 : padding + (index / (sorted.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((entry.value - min) / span) * (chartHeight - padding * 2);
      return { x, y, entry };
    });
  }, [sorted, goal]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              Current
            </Text>
            <Text variant="headlineSmall">{latest ? `${latest.value.toFixed(1)} ${latest.unit}` : '—'}</Text>
            {latest?.source ? (
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                {latest.source === 'manual'
                  ? 'Manual entry'
                  : `Synced from ${latest.source === 'healthKit' ? 'Apple Health' : latest.source === 'healthConnect' ? 'Health Connect' : latest.source === 'wearable' ? 'connected scale' : 'imported data'}`}
              </Text>
            ) : null}
          </View>
          {goal != null ? (
            <View>
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                Goal
              </Text>
              <Text variant="titleMedium">{goal.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <SegmentedButtons value={range} onValueChange={(v) => onRangeChange(v as ChartRange)} buttons={(Object.keys(RANGE_LABEL) as ChartRange[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} />

        {sorted.length === 0 ? (
          <StateView preset="empty" compact title="No entries yet" description="Log your first weight to start tracking a trend." />
        ) : (
          <>
            <View style={{ height: chartHeight }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                {goal != null && points.length > 0 ? (
                  <Line x1={0} x2={chartWidth} y1={chartHeight - padding} y2={chartHeight - padding} stroke={wellness.colors.onSurfaceVariant} strokeDasharray="4 4" strokeWidth={1} opacity={0.4} />
                ) : null}
                <Path d={pathD} stroke={wellness.colors.primary} strokeWidth={2} fill="none" />
                {points.map((p) => (
                  <Circle key={p.entry.id} cx={p.x} cy={p.y} r={3} fill={wellness.colors.primary} />
                ))}
              </Svg>
            </View>

            {trendLabel ? (
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                {trendLabel}
              </Text>
            ) : null}

            {/* Text/table equivalent of the chart — exact values always available */}
            <View style={{ gap: 2 }}>
              {sorted.slice(-5).reverse().map((entry) => (
                <TouchableRipple
                  key={entry.id}
                  onPress={onEntryPress ? () => onEntryPress(entry.id) : undefined}
                  disabled={!onEntryPress}
                  accessibilityRole={onEntryPress ? 'button' : 'text'}
                  accessibilityLabel={`${entry.value.toFixed(1)} ${entry.unit} recorded ${new Date(entry.measuredAt).toLocaleDateString()}`}
                  testID={childTestID(id, `entry-${entry.id}`)}
                >
                  <View style={styles.entryRow}>
                    <Text variant="bodySmall" style={styles.flex}>
                      {new Date(entry.measuredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </Text>
                    <Text variant="bodySmall">
                      {entry.value.toFixed(1)} {entry.unit}
                    </Text>
                  </View>
                </TouchableRipple>
              ))}
            </View>
          </>
        )}

        <AppButton variant="secondary" size="sm" onPress={onAddEntry} testID={childTestID(id, 'add')}>
          Add weight
        </AppButton>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
});
