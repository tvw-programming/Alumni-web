import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { formatMoney } from '@ui/primitives/money';
import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { CalendarDate, TimeSlot } from '../types/domain';

type Period = 'morning' | 'afternoon' | 'evening';
const PERIOD_LABEL: Record<Period, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
const periodOf = (iso: string): Period => {
  const hour = new Date(iso).getHours();
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
};

export interface SlotBookingCalendarProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  dates: CalendarDate[];
  slotsByDate: Record<string, TimeSlot[]>;
  selectedDate?: string;
  onDateChange: (date: string) => void;
  selectedSlotId?: string;
  onSlotChange: (slotId: string) => void;
  loading?: boolean;
  locale?: string;
  displayTimezone?: string;
  onJoinWaitlist?: () => void;
  onRefresh?: () => void;
}

/**
 * Date and time selection for a booking.
 *
 * A near-term date strip rather than a full month grid, because most home-
 * service bookings happen inside the next week — a full calendar for that is
 * more taps, not more clarity. Time zone is always stated, never assumed, and
 * an unavailable date is a visible zero, not a missing tile.
 */
export const SlotBookingCalendar = ({
  dates,
  slotsByDate,
  selectedDate,
  onDateChange,
  selectedSlotId,
  onSlotChange,
  loading = false,
  locale = 'en-IN',
  displayTimezone,
  onJoinWaitlist,
  onRefresh,
  animated = true,
  style,
  containerStyle,
  testID,
}: SlotBookingCalendarProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const motion = useMotion({ animated });

  const id = testID ?? 'slot-calendar';
  const [activeDate, setActiveDate] = useControllableState<string>({
    value: selectedDate,
    defaultValue: dates[0]?.date ?? '',
    onChange: onDateChange,
  });

  const daySlots = useMemo(() => slotsByDate[activeDate] ?? [], [activeDate, slotsByDate]);

  const grouped = useMemo(() => {
    const buckets: Record<Period, TimeSlot[]> = { morning: [], afternoon: [], evening: [] };
    for (const slot of daySlots) buckets[periodOf(slot.startsAt)].push(slot);
    return (Object.keys(buckets) as Period[]).map((period) => ({ period, slots: buckets[period] })).filter((g) => g.slots.length > 0);
  }, [daySlots]);

  const formatTime = (iso: string) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

  if (loading) {
    return (
      <View style={[{ gap: theme.spacing.md }, containerStyle]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={1} height={56} />
        <SkeletonLoader shape="text" lines={3} height={44} />
      </View>
    );
  }

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={id}>
      <View style={[styles.row, { gap: 4 }]}>
        <Icon source="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Times shown in your local time{displayTimezone ? ` (${displayTimezone})` : ''}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }} accessibilityRole="tablist">
        {dates.map((option) => {
          const selected = option.date === activeDate;
          const date = new Date(`${option.date}T00:00:00`);
          const none = option.availableCount === 0;
          return (
            <TouchableRipple
              key={option.date}
              onPress={() => setActiveDate(option.date)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}, ${none ? 'no availability' : `${option.availableCount} times`}`}
              style={[
                styles.dateChip,
                {
                  borderRadius: theme.radii.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? service.colors.statusAssigned : theme.colors.outlineVariant,
                  backgroundColor: selected ? service.colors.surfaceSelected : theme.colors.surface,
                  padding: theme.spacing.sm,
                },
              ]}
              testID={childTestID(id, `date-${option.date}`)}
            >
              <View style={styles.center}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {option.isToday ? 'Today' : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)}
                </Text>
                <Text variant="titleSmall" style={styles.tabular}>
                  {date.getDate()}
                </Text>
                <Text variant="labelSmall" style={{ color: none ? theme.colors.onSurfaceVariant : service.colors.availableNow }}>
                  {none ? 'None' : option.availableCount}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>

      {grouped.length === 0 ? (
        <StateView
          preset="empty"
          compact
          title="No times available"
          description="Try a different date, or join the waitlist for a cancellation."
          primaryAction={onJoinWaitlist ? { label: 'Join waitlist', onPress: onJoinWaitlist } : undefined}
          secondaryAction={onRefresh ? { label: 'Refresh', onPress: onRefresh } : undefined}
          testID={childTestID(id, 'empty')}
        />
      ) : (
        grouped.map((group) => (
          <View key={group.period} style={{ gap: theme.spacing.sm }}>
            <Text variant="labelLarge" accessibilityRole="header">
              {PERIOD_LABEL[group.period]}
            </Text>
            <Animated.View style={[styles.slots, { gap: theme.spacing.sm }]} layout={motion.layout}>
              {group.slots.map((slot) => {
                const selected = slot.id === selectedSlotId;
                const disabled = slot.status !== 'available';
                return (
                  <TouchableRipple
                    key={slot.id}
                    onPress={() => !disabled && onSlotChange(slot.id)}
                    disabled={disabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled }}
                    accessibilityLabel={`${formatTime(slot.startsAt)}${slot.price ? `, ${formatMoney(slot.price, { locale })}` : ''}${slot.premium ? ', premium time' : ''}${disabled ? `, ${slot.status === 'held' ? 'just held by someone else' : slot.status}` : ''}`}
                    style={[
                      styles.slotChip,
                      {
                        minWidth: service.layout.slotChipMinWidth,
                        borderRadius: theme.radii.md,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? service.colors.statusAssigned : theme.colors.outlineVariant,
                        backgroundColor: selected ? service.colors.surfaceSelected : theme.colors.surface,
                        opacity: disabled ? 0.45 : 1,
                      },
                    ]}
                    testID={childTestID(id, `slot-${slot.id}`)}
                  >
                    <View style={styles.center}>
                      <View style={[styles.row, { gap: 4 }]}>
                        {selected ? <Icon source="check" size={13} color={service.colors.statusAssigned} /> : null}
                        <Text variant="bodyMedium" style={styles.tabular}>
                          {formatTime(slot.startsAt)}
                        </Text>
                      </View>
                      {slot.price ? (
                        <Text variant="labelSmall" style={{ color: slot.premium ? service.colors.statusDelayed : theme.colors.onSurfaceVariant }}>
                          {formatMoney(slot.price, { locale })}
                          {slot.premium ? ' · premium' : ''}
                        </Text>
                      ) : null}
                      {slot.status === 'held' ? (
                        <Text variant="labelSmall" style={{ color: service.colors.statusDelayed }}>
                          Just booked
                        </Text>
                      ) : slot.status === 'expired' ? (
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Expired
                        </Text>
                      ) : null}
                    </View>
                  </TouchableRipple>
                );
              })}
            </Animated.View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dateChip: { minWidth: 60 },
  slots: { flexDirection: 'row', flexWrap: 'wrap' },
  slotChip: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  tabular: { fontVariant: ['tabular-nums'] },
});
