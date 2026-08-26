import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotion } from '@/hooks';
import { useAppTheme } from '@/theme';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, type Money } from '../types/money';

export interface TrendPoint {
  label: string;
  value: Money;
  /** Comparison period, drawn as a ghost bar behind the main one. */
  comparison?: Money;
}

export interface BarChartProps {
  data: TrendPoint[];
  height?: number;
  locale?: string;
  animated?: boolean;
  testID?: string;
}

/** Period-over-period bars. Comparison is a ghost bar, not a second colour ramp. */
export const BarChart = ({ data, height = 140, locale = 'en-IN', animated = true, testID }: BarChartProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();

  const max = useMemo(
    () => Math.max(1, ...data.flatMap((d) => [d.value.minorUnits, d.comparison?.minorUnits ?? 0])),
    [data],
  );

  return (
    <View
      style={[styles.row, { height, gap: theme.spacing.xs }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {data.map((point) => (
        <Bar
          key={point.label}
          point={point}
          max={max}
          color={fintech.colors.chart1}
          ghostColor={theme.colors.surfaceVariant}
          labelColor={theme.colors.onSurfaceVariant}
          locale={locale}
          animated={animated}
        />
      ))}
    </View>
  );
};

const Bar = ({
  point,
  max,
  color,
  ghostColor,
  labelColor,
  locale,
  animated,
}: {
  point: TrendPoint;
  max: number;
  color: string;
  ghostColor: string;
  labelColor: string;
  locale: string;
  animated: boolean;
}) => {
  const motion = useMotion({ animated });
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = motion.enabled ? withTiming(1, motion.timing('slow', 'emphasized')) : 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion.enabled]);

  const ratio = point.value.minorUnits / max;
  const ghostRatio = (point.comparison?.minorUnits ?? 0) / max;

  const style = useAnimatedStyle(() => ({ height: `${ratio * 100 * progress.value}%` }));

  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        {point.comparison ? (
          <View style={[styles.ghost, { height: `${ghostRatio * 100}%`, backgroundColor: ghostColor }]} />
        ) : null}
        <Animated.View style={[styles.bar, style, { backgroundColor: color }]} />
      </View>
      <Text variant="labelSmall" style={{ color: labelColor }} numberOfLines={1}>
        {point.label}
      </Text>
      <Text variant="labelSmall" style={{ color: labelColor, fontSize: 9 }} numberOfLines={1}>
        {formatMoney(point.value, { locale, omitSymbol: true })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  barColumn: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  ghost: { position: 'absolute', bottom: 0, width: '100%', borderRadius: 4 },
});
