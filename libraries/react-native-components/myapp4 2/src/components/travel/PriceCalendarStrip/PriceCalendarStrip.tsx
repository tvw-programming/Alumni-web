import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { CalendarPrice, CalendarPriceLabel } from '../types/domain';

const LABEL_COPY: Record<CalendarPriceLabel, string> = {
  cheapest: 'Cheapest',
  bestValue: 'Best value',
  highDemand: 'High demand',
};

export interface PriceCalendarStripProps extends StyleEscapeHatches {
  prices: CalendarPrice[];
  selectedDate?: string;
  onSelect: (date: string) => void;
  onTrackPrice?: () => void;
  locale?: string;
}

/**
 * A horizontally scrollable strip for flexible-date price discovery. Labels
 * such as "Cheapest" always carry text alongside colour, and predicted
 * pricing is called a trend, never a guarantee — "Prices may change" is
 * always visible, not tucked into a tooltip.
 */
export const PriceCalendarStrip = ({ prices, selectedDate, onSelect, onTrackPrice, locale = 'en-IN', style, containerStyle, testID }: PriceCalendarStripProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? 'price-calendar-strip';

  const cheapest = useMemo(() => {
    const available = prices.filter((p) => p.status === 'available' && p.price);
    if (available.length === 0) return undefined;
    return available.reduce((min, p) => (p.price!.minorUnits < min.price!.minorUnits ? p : min));
  }, [prices]);

  return (
    <View style={[containerStyle, style]} testID={id}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
        {prices.map((entry) => {
          const selected = entry.date === selectedDate;
          const isCheapest = entry.label === 'cheapest' || entry.date === cheapest?.date;
          const date = new Date(entry.date);
          const disabled = entry.status !== 'available';

          return (
            <TouchableRipple
              key={entry.date}
              onPress={disabled ? undefined : () => onSelect(entry.date)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              accessibilityLabel={`${new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)}${
                entry.status === 'available' && entry.price ? `, ${formatMoney(entry.price, { locale })}` : entry.status === 'unavailable' ? ', no flights available' : ''
              }${entry.label ? `, ${LABEL_COPY[entry.label]}` : ''}`}
              style={[
                styles.cell,
                {
                  minWidth: travel.layout.calendarCellMinWidth,
                  borderRadius: theme.radii.md,
                  borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  backgroundColor: selected ? travel.colors.surfaceSelected : theme.colors.surface,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              testID={childTestID(id, entry.date)}
            >
              <View style={{ padding: theme.spacing.sm, alignItems: 'center' }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)}
                </Text>
                <Text variant="labelMedium">{date.getDate()}</Text>

                {entry.status === 'loading' ? (
                  <SkeletonLoader shape="text" lines={1} containerStyle={{ width: 40, marginTop: 4 }} />
                ) : entry.status === 'unavailable' ? (
                  <Text variant="labelSmall" style={{ color: travel.colors.soldOut, marginTop: 4 }}>
                    No flights
                  </Text>
                ) : entry.price ? (
                  <Text variant="labelSmall" style={{ color: isCheapest ? travel.colors.cheapest : theme.colors.onSurface, marginTop: 4 }}>
                    {formatMoney(entry.price, { locale, omitSymbol: false })}
                  </Text>
                ) : (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    —
                  </Text>
                )}

                {entry.label ? (
                  <View style={styles.labelRow}>
                    {entry.trend ? (
                      <Icon
                        source={entry.trend === 'up' ? 'trending-up' : entry.trend === 'down' ? 'trending-down' : 'trending-neutral'}
                        size={10}
                        color={entry.label === 'cheapest' ? travel.colors.cheapest : entry.label === 'highDemand' ? travel.colors.highDemand : travel.colors.bestValue}
                      />
                    ) : null}
                    <Text
                      variant="labelSmall"
                      style={{
                        color: entry.label === 'cheapest' ? travel.colors.cheapest : entry.label === 'highDemand' ? travel.colors.highDemand : travel.colors.bestValue,
                        marginLeft: entry.trend ? 2 : 0,
                      }}
                    >
                      {LABEL_COPY[entry.label]}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>

      <View style={[styles.footerRow, { marginTop: theme.spacing.sm }]}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
          Prices may change before booking.
        </Text>
        {onTrackPrice ? (
          <AppButton variant="ghost" size="sm" onPress={onTrackPrice} testID={childTestID(id, 'track')}>
            Track prices
          </AppButton>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cell: { overflow: 'hidden' },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
});
