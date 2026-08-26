import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { WeatherAlertLevel, WeatherDay } from '../types/domain';

export interface WeatherForecastStripProps extends StyleEscapeHatches {
  days: WeatherDay[];
  unit: 'C' | 'F';
  loading?: boolean;
  stale?: boolean;
  updatedLabel?: string;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onViewDetails?: () => void;
}

const ALERT_META: Record<Exclude<WeatherAlertLevel, 'none'>, { label: string; colorKey: 'warning' | 'error' }> = {
  watch: { label: 'Watch', colorKey: 'warning' },
  warning: { label: 'Weather alert', colorKey: 'warning' },
  severe: { label: 'Severe alert', colorKey: 'error' },
};

/**
 * A weather icon is never the only signal for rain, heat, wind, or storm
 * risk — every alert level renders as a paired icon and word, and a stale
 * forecast says so in text rather than silently showing old numbers as
 * current.
 */
export const WeatherForecastStrip = ({ days, unit, loading = false, stale = false, updatedLabel, selectedDate, onSelectDate, onViewDetails, style, containerStyle, testID }: WeatherForecastStripProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? 'weather-forecast-strip';

  if (loading) {
    return (
      <View style={[styles.loadingBox, containerStyle, style]} testID={`${id}-loading`}>
        <ActivityIndicator size={20} accessibilityLabel="Loading forecast" />
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <View style={[styles.loadingBox, containerStyle, style]} testID={`${id}-empty`}>
        <Icon source="weather-cloudy-alert" size={20} color={agri.colors.onSurfaceVariant} />
        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginTop: 4 }}>
          Weather data unavailable
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      {stale ? (
        <View style={[styles.row, { marginBottom: 4 }]}>
          <Icon source="clock-alert-outline" size={12} color={agri.colors.warning} />
          <Text variant="labelSmall" style={{ color: agri.colors.warning, marginLeft: 4 }}>
            Showing cached forecast
          </Text>
        </View>
      ) : updatedLabel ? (
        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginBottom: 4 }}>
          Updated {updatedLabel}
        </Text>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((day) => {
          const selected = day.date === selectedDate;
          const alertMeta = day.alert && day.alert !== 'none' ? ALERT_META[day.alert] : undefined;
          return (
            <TouchableRipple
              key={day.date}
              onPress={onSelectDate ? () => onSelectDate(day.date) : undefined}
              accessibilityRole={onSelectDate ? 'button' : undefined}
              accessibilityState={{ selected }}
              accessibilityLabel={`${day.label}, ${day.high != null ? `high ${day.high}°${unit}` : ''}${day.precipitationChance != null ? `, rain ${day.precipitationChance}%` : ''}${alertMeta ? `, ${alertMeta.label}` : ''}`}
              style={[
                styles.dayCard,
                { width: agri.layout.forecastCardWidth, borderRadius: theme.radii.md, backgroundColor: selected ? theme.colors.primaryContainer : agri.colors.surfaceVariant },
              ]}
              testID={childTestID(id, `day-${day.date}`)}
            >
              <View style={styles.dayInner}>
                <Text variant="labelSmall" style={{ color: selected ? theme.colors.onPrimaryContainer : agri.colors.onSurfaceVariant }}>
                  {day.label}
                </Text>
                <Icon source={day.icon} size={22} color={selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface} />
                <Text variant="labelMedium" style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}>
                  {day.high != null ? `${day.high}°` : '—'}
                  {day.low != null ? ` / ${day.low}°` : ''}
                </Text>
                {day.precipitationChance != null ? (
                  <View style={styles.row}>
                    <Icon source="water-outline" size={11} color={selected ? theme.colors.onPrimaryContainer : agri.colors.onSurfaceVariant} />
                    <Text variant="labelSmall" style={{ color: selected ? theme.colors.onPrimaryContainer : agri.colors.onSurfaceVariant, marginLeft: 2 }}>
                      {day.precipitationChance}%
                    </Text>
                  </View>
                ) : null}
                {alertMeta ? (
                  <View style={styles.row}>
                    <Icon source="alert-outline" size={11} color={agri.colors[alertMeta.colorKey]} />
                    <Text variant="labelSmall" style={{ color: agri.colors[alertMeta.colorKey], marginLeft: 2 }} numberOfLines={1}>
                      {alertMeta.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>

      {onViewDetails ? (
        <Text variant="labelMedium" onPress={onViewDetails} accessibilityRole="button" style={{ color: theme.colors.primary, marginTop: 6 }}>
          View hourly forecast
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  dayCard: { paddingVertical: 10, paddingHorizontal: 6 },
  dayInner: { alignItems: 'center', gap: 4 },
});
