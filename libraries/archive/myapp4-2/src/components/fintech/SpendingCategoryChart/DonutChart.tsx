import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useAppTheme } from '@/theme';

import { CHART_SERIES, useFintechTheme, type FintechColorName } from '../theme/fintechTokens';
import type { CategoryDatum } from '../types/domain';

export interface DonutChartProps {
  data: CategoryDatum[];
  size?: number;
  strokeWidth?: number;
  /** Rendered in the hole — usually the period total. */
  center?: React.ReactNode;
  onSegmentPress?: (datum: CategoryDatum) => void;
  testID?: string;
}

/**
 * Composition donut.
 *
 * Charts here are decorative-by-default for assistive tech: the SVG is hidden
 * from screen readers and `AccessibleDataTable` carries the real values. A
 * screen reader announcing 7 unlabelled arc paths helps nobody.
 */
export const DonutChart = ({ data, size = 180, strokeWidth, center, testID }: DonutChartProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();

  const stroke = strokeWidth ?? fintech.layout.donutStrokeWidth;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let offset = 0;
    return data.map((datum, index) => {
      const fraction = Math.max(0, Math.min(1, datum.percentage / 100));
      const length = fraction * circumference;
      const token = (datum.colorToken as FintechColorName | undefined) ?? CHART_SERIES[index % CHART_SERIES.length]!;
      const segment = {
        key: datum.id,
        color: fintech.colors[token] ?? fintech.colors.chartOther,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      };
      offset += length;
      return segment;
    });
  }, [circumference, data, fintech.colors]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
      <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {/* Rotate so the first segment starts at 12 o'clock. */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.surfaceVariant}
            strokeWidth={stroke}
            fill="none"
          />
          {segments.map((segment) => (
            <Circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={stroke}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
        </G>
      </Svg>

      {center ? <View style={{ position: 'absolute', alignItems: 'center' }}>{center}</View> : null}
    </View>
  );
};
