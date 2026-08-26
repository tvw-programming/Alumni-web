import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Icon, SegmentedButtons, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { PriceTrendPoint, TrendRange } from '../types/domain';

const RANGE_LABEL: Record<TrendRange, string> = { '3m': '3M', '6m': '6M', '1y': '1Y', '5y': '5Y' };

export interface PriceTrendChartProps extends StyleEscapeHatches {
  points: PriceTrendPoint[];
  currentValue?: number;
  range: TrendRange;
  freshnessLabel?: string;
  onRangeChange?: (range: TrendRange) => void;
}

/**
 * A trend is never framed as investment advice — the measure ("average
 * price per sq ft") and geographic scope are always stated, and every
 * plotted point is also listed as an exact value beneath the chart.
 */
export const PriceTrendChart = ({ points, currentValue, range, freshnessLabel, onRangeChange, style, containerStyle, testID }: PriceTrendChartProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'price-trend-chart';

  const chartWidth = 280;
  const chartHeight = 90;
  const padding = 10;

  const { pathD, coords, changePercent } = useMemo(() => {
    if (points.length === 0) return { pathD: '', coords: [] as { x: number; y: number; point: PriceTrendPoint }[], changePercent: 0 };
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const coordsList = points.map((point, index) => {
      const x = points.length === 1 ? chartWidth / 2 : padding + (index / (points.length - 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - ((point.value - min) / span) * (chartHeight - padding * 2);
      return { x, y, point };
    });
    const first = values[0]!;
    const last = values[values.length - 1]!;
    const percent = first === 0 ? 0 : ((last - first) / first) * 100;
    return { pathD: coordsList.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' '), coords: coordsList, changePercent: percent };
  }, [points]);

  const direction = changePercent > 0.05 ? 'up' : changePercent < -0.05 ? 'down' : 'flat';
  const trendColor = direction === 'up' ? realestate.colors.priceUp : direction === 'down' ? realestate.colors.priceDown : realestate.colors.priceFlat;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
              Average price per sq ft
            </Text>
            <Text variant="headlineSmall">{currentValue != null ? `₹${currentValue.toLocaleString()}` : '—'}</Text>
          </View>
          {points.length > 1 ? (
            <View style={styles.row}>
              <Icon source={direction === 'up' ? 'trending-up' : direction === 'down' ? 'trending-down' : 'trending-neutral'} size={14} color={trendColor} />
              <Text variant="labelMedium" style={{ color: trendColor, marginLeft: 4 }}>
                {direction === 'flat' ? 'Prices are stable' : `${direction === 'up' ? 'Up' : 'Down'} ${Math.abs(changePercent).toFixed(1)}%`}
              </Text>
            </View>
          ) : null}
        </View>

        {onRangeChange ? (
          <SegmentedButtons value={range} onValueChange={(v) => onRangeChange(v as TrendRange)} buttons={(Object.keys(RANGE_LABEL) as TrendRange[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} />
        ) : null}

        {points.length === 0 ? (
          <StateView preset="empty" compact title="No price data" description="Price history isn't available for this locality yet." />
        ) : (
          <>
            <View style={{ height: chartHeight }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <Path d={pathD} stroke={theme.colors.primary} strokeWidth={2} fill="none" />
                {coords.map((c) => (
                  <Circle key={c.point.date} cx={c.x} cy={c.y} r={2.5} fill={theme.colors.primary} />
                ))}
              </Svg>
            </View>

            {/* Accessible data table — exact values, never chart-only */}
            <View style={{ gap: 2 }}>
              {points.slice(-5).reverse().map((point) => (
                <View key={point.date} style={styles.row}>
                  <Text variant="labelSmall" style={styles.flex}>
                    {new Date(point.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </Text>
                  <Text variant="labelSmall">
                    ₹{point.value.toLocaleString()}/{point.unit}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {freshnessLabel ? (
          <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
            {freshnessLabel}
          </Text>
        ) : null}

        <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, fontStyle: 'italic' }}>
          Historical trend, not investment advice.
        </Text>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
