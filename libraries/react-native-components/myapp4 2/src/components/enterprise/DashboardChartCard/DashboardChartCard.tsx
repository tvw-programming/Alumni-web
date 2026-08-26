import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, SegmentedButtons, Text, TouchableRipple } from 'react-native-paper';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { ChartDatum, ChartType, LegendItem } from '../types/domain';

export interface DashboardChartCardProps extends StyleEscapeHatches {
  title: string;
  subtitle?: string;
  chartType: ChartType;
  data: ChartDatum[];
  legend?: LegendItem[];
  rangeLabel?: string;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  freshnessLabel?: string;
  rangeOptions?: { value: string; label: string }[];
  selectedRange?: string;
  onPress?: () => void;
  onViewReport?: () => void;
  onSelectDatum?: (datum: ChartDatum) => void;
  onRangeChange?: (range: string) => void;
}

const CHART_COLORS = ['#2563EB', '#087F5B', '#B7791F', '#C53030', '#6750A4', '#0F766E'];

/**
 * The same normalized `ChartDatum[]` model renders through bar, line, pie or
 * area — swapping `chartType` never requires a different data shape. Every
 * chart carries an accessible text summary and a tappable legend so a
 * critical value is never locked behind a chart-only gesture.
 */
export const DashboardChartCard = ({
  title,
  subtitle,
  chartType,
  data,
  legend,
  rangeLabel,
  loading = false,
  error,
  emptyMessage = 'No data for this period.',
  freshnessLabel,
  rangeOptions,
  selectedRange,
  onPress,
  onViewReport,
  onSelectDatum,
  onRangeChange,
  style,
  containerStyle,
  testID,
}: DashboardChartCardProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `dashboard-chart-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const colorFor = (index: number, datum: ChartDatum) => datum.colorToken ?? CHART_COLORS[index % CHART_COLORS.length]!;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text variant="titleSmall">{title}</Text>
              {subtitle ? (
                <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {rangeLabel ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
                {rangeLabel}
              </Text>
            ) : null}
          </View>

          {rangeOptions && rangeOptions.length > 0 && onRangeChange ? (
            <SegmentedButtons value={selectedRange ?? rangeOptions[0]!.value} onValueChange={onRangeChange} buttons={rangeOptions} />
          ) : null}

          {loading ? (
            <SkeletonLoader shape="rect" height={140} />
          ) : error ? (
            <View style={styles.row}>
              <Icon source="alert-circle-outline" size={14} color={theme.colors.error} />
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: 4 }}>
                {error}
              </Text>
            </View>
          ) : data.length === 0 ? (
            <StateView preset="empty" compact title={emptyMessage} />
          ) : (
            <>
              <View style={{ height: 140 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={childTestID(id, 'chart')}>
                {chartType === 'bar' ? <BarChart data={data} colorFor={colorFor} selectedId={selectedId} /> : chartType === 'line' || chartType === 'area' ? <LineChart data={data} filled={chartType === 'area'} color={theme.colors.primary} /> : <PieChart data={data} colorFor={colorFor} />}
              </View>

              {/* Accessible summary — the chart is never the only way to read a value */}
              <View style={{ gap: 2 }}>
                {data.map((datum, index) => (
                  <TouchableRipple
                    key={datum.id}
                    onPress={onSelectDatum ? () => { setSelectedId(datum.id); onSelectDatum(datum); } : undefined}
                    disabled={!onSelectDatum}
                    accessibilityRole={onSelectDatum ? 'button' : 'text'}
                    accessibilityLabel={`${datum.label}: ${datum.value.toLocaleString()}`}
                    testID={childTestID(id, `datum-${datum.id}`)}
                  >
                    <View style={[styles.legendRow, selectedId === datum.id ? { backgroundColor: enterprise.colors.selected } : undefined]}>
                      <View style={[styles.dot, { backgroundColor: colorFor(index, datum) }]} />
                      <Text variant="labelSmall" style={styles.flex}>
                        {datum.label}
                      </Text>
                      <Text variant="labelSmall">{datum.value.toLocaleString()}</Text>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </>
          )}

          {freshnessLabel ? (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              {freshnessLabel}
            </Text>
          ) : null}

          {onViewReport ? (
            <AppButton variant="ghost" size="sm" onPress={onViewReport} testID={childTestID(id, 'view-report')}>
              View report
            </AppButton>
          ) : null}
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const BarChart = ({ data, colorFor, selectedId }: { data: ChartDatum[]; colorFor: (i: number, d: ChartDatum) => string; selectedId?: string }) => {
  const width = 280;
  const height = 140;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = width / data.length - 8;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((datum, index) => {
        const barHeight = (datum.value / max) * (height - 10);
        const x = index * (width / data.length) + 4;
        return <Rect key={datum.id} x={x} y={height - barHeight} width={barWidth} height={barHeight} rx={3} fill={colorFor(index, datum)} opacity={!selectedId || selectedId === datum.id ? 1 : 0.4} />;
      })}
    </Svg>
  );
};

const LineChart = ({ data, filled, color }: { data: ChartDatum[]; filled: boolean; color: string }) => {
  const width = 280;
  const height = 140;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = Math.max(1, max - min);
  const points = data.map((d, i) => ({ x: (i / Math.max(1, data.length - 1)) * width, y: height - ((d.value - min) / span) * height }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = filled ? `${pathD} L ${width} ${height} L 0 ${height} Z` : undefined;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} x2={width} y1={height - 1} y2={height - 1} stroke={color} strokeOpacity={0.15} strokeWidth={1} />
      {areaD ? <Path d={areaD} fill={color} opacity={0.15} /> : null}
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
    </Svg>
  );
};

const PieChart = ({ data, colorFor }: { data: ChartDatum[]; colorFor: (i: number, d: ChartDatum) => string }) => {
  const size = 140;
  const radius = size / 2 - 6;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((datum, index) => {
        const fraction = datum.value / total;
        const length = fraction * circumference;
        const el = (
          <Circle
            key={datum.id}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorFor(index, datum)}
            strokeWidth={20}
            fill="transparent"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        );
        offset += length;
        return el;
      })}
    </Svg>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});
