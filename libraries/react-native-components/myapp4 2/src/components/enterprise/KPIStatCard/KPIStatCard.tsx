import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';
import Svg, { Polyline } from 'react-native-svg';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { KPIStat, KpiStatus, KpiTrend } from '../types/domain';

const STATUS_COLOR_KEY: Record<KpiStatus, 'success' | 'warning' | 'error' | 'onSurfaceVariant'> = {
  positive: 'success',
  warning: 'warning',
  negative: 'error',
  neutral: 'onSurfaceVariant',
};

const TREND_ICON: Record<KpiTrend, string> = { up: 'trending-up', down: 'trending-down', flat: 'trending-neutral', neutral: 'minus' };

export interface KPIStatCardProps extends StyleEscapeHatches {
  stat: KPIStat;
  loading?: boolean;
  error?: string;
  showSparkline?: boolean;
  showTarget?: boolean;
  onPress?: () => void;
}

/**
 * "Up" is never assumed to be good — the semantic `status` (positive/
 * warning/negative/neutral) drives colour, and the delta always renders next
 * to explanatory text ("Compared with last month"), never a bare percentage
 * with an implied meaning.
 */
export const KPIStatCard = ({ stat, loading = false, error, showSparkline = true, showTarget = true, onPress, style, containerStyle, testID }: KPIStatCardProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `kpi-${stat.label.toLowerCase().replace(/\s+/g, '-')}`;
  const statusColorKey = stat.status ? STATUS_COLOR_KEY[stat.status] : 'onSurfaceVariant';

  const a11ySentence = `${stat.label}, ${stat.value}${
    stat.delta != null ? `, ${stat.trend === 'down' ? 'down' : stat.trend === 'up' ? 'up' : ''} ${Math.abs(stat.delta)} percent${stat.periodLabel ? ` ${stat.periodLabel}` : ''}` : ''
  }`;

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={`${id}-loading`}>
        <ActivityIndicator size={20} accessibilityLabel={`Loading ${stat.label}`} />
      </AppCard>
    );
  }

  if (error) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={`${id}-error`}>
        <View style={styles.row}>
          <Icon source="alert-circle-outline" size={14} color={theme.colors.error} />
          <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: 4 }}>
            {error}
          </Text>
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11ySentence}>
        <View style={{ gap: 4 }}>
          <Text variant="labelMedium" style={{ color: enterprise.colors.onSurfaceVariant }}>
            {stat.label}
          </Text>
          <Text variant="headlineSmall" numberOfLines={1} adjustsFontSizeToFit>
            {stat.value}
          </Text>

          {stat.delta != null ? (
            <View style={styles.row}>
              <Icon source={TREND_ICON[stat.trend ?? 'neutral']} size={13} color={enterprise.colors[statusColorKey]} />
              <Text variant="labelSmall" style={{ color: enterprise.colors[statusColorKey], marginLeft: 3 }}>
                {stat.deltaLabel ?? `${stat.delta > 0 ? 'Up' : stat.delta < 0 ? 'Down' : ''} ${Math.abs(stat.delta)}%`}
                {stat.periodLabel ? ` ${stat.periodLabel}` : ''}
              </Text>
            </View>
          ) : (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              No data for this period
            </Text>
          )}

          {showTarget && stat.target != null ? (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
              Target: {stat.target.toLocaleString()}
            </Text>
          ) : null}

          {showSparkline && stat.sparkline && stat.sparkline.length > 1 ? (
            <View style={{ height: enterprise.layout.kpiSparklineHeight, marginTop: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Sparkline values={stat.sparkline} color={enterprise.colors[statusColorKey]} height={enterprise.layout.kpiSparklineHeight} />
            </View>
          ) : null}
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const Sparkline = ({ values, color, height }: { values: number[]; color: string; height: number }) => {
  const width = 140;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / span) * height}`).join(' ');

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
