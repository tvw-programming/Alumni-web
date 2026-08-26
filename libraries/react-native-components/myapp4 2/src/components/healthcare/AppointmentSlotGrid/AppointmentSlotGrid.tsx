import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { formatMoney } from '@ui/primitives/money';
import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { AppointmentSlot, SlotGridState, ConsultationMode } from '../types/domain';

type Period = 'morning' | 'afternoon' | 'evening';

const PERIOD_LABEL: Record<Period, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const periodOf = (iso: string): Period => {
  const hour = new Date(iso).getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export interface DateOption {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  availableCount: number;
}

export interface AppointmentSlotGridProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  slots: AppointmentSlot[];
  dates: DateOption[];
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  selectedSlotId?: string;
  onSlotChange?: (slot: AppointmentSlot) => void;
  state?: SlotGridState;
  locale?: string;
  /** IANA zone the times are displayed in. Always shown to the user. */
  displayTimezone?: string;
  mode?: ConsultationMode;
  durationMinutes?: number;
  /** Re-fetch availability. Called on mount, focus, and before booking. */
  onRefresh?: () => void;
  onConfirm?: (slot: AppointmentSlot) => void;
  onJoinWaitlist?: () => void;
  confirmLabel?: string;
}

/**
 * Availability picker.
 *
 * The rule that shapes this component: selection is optimistic, booking is not.
 * A slot can be selected instantly, but `state="conflict"` (someone else took
 * it) is a first-class state, and the caller is expected to re-validate
 * availability before confirming rather than trusting this grid.
 */
export const AppointmentSlotGrid = ({
  slots,
  dates,
  selectedDate,
  onDateChange,
  selectedSlotId,
  onSlotChange,
  state = 'ready',
  locale = 'en-IN',
  displayTimezone,
  mode = 'inPerson',
  durationMinutes,
  onRefresh,
  onConfirm,
  onJoinWaitlist,
  confirmLabel = 'Confirm appointment',
  animated = true,
  style,
  containerStyle,
  testID,
}: AppointmentSlotGridProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const motion = useMotion({ animated });

  const [activeDate, setActiveDate] = useControllableState<string>({
    value: selectedDate,
    defaultValue: dates[0]?.date ?? '',
    onChange: onDateChange,
  });

  const [activeSlotId, setActiveSlotId] = useControllableState<string>({
    value: selectedSlotId,
    defaultValue: '',
    onChange: undefined,
  });

  const daySlots = useMemo(
    () => slots.filter((slot) => slot.start.slice(0, 10) === activeDate),
    [activeDate, slots],
  );

  const grouped = useMemo(() => {
    const buckets: Record<Period, AppointmentSlot[]> = { morning: [], afternoon: [], evening: [] };
    for (const slot of daySlots) buckets[periodOf(slot.start)].push(slot);
    return (Object.keys(buckets) as Period[])
      .map((period) => ({ period, slots: buckets[period] }))
      .filter((group) => group.slots.length > 0);
  }, [daySlots]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === activeSlotId),
    [activeSlotId, slots],
  );

  const formatTime = useCallback(
    (iso: string) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)),
    [locale],
  );

  const handleSelect = useCallback(
    (slot: AppointmentSlot) => {
      if (slot.status !== 'available') return;
      setActiveSlotId(slot.id);
      onSlotChange?.(slot);
    },
    [onSlotChange, setActiveSlotId],
  );

  if (state === 'loading') {
    return (
      <View style={[{ gap: theme.spacing.md }, containerStyle]} testID={childTestID(testID, 'loading')}>
        <SkeletonLoader shape="text" lines={1} height={56} />
        <SkeletonLoader shape="text" lines={4} height={44} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <StateView
        preset="error"
        title="We could not load available times"
        description="This can happen when the clinic's scheduling system is busy."
        primaryAction={onRefresh ? { label: 'Try again', onPress: onRefresh } : undefined}
        containerStyle={containerStyle}
        testID={childTestID(testID, 'error')}
      />
    );
  }

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {/* Time zone is stated, never assumed. */}
      <View style={[styles.row, { gap: 4 }]}>
        <Icon source="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Times shown in your local time
          {displayTimezone ? ` (${displayTimezone})` : ''}
          {durationMinutes ? ` · ${durationMinutes} minute ${mode === 'inPerson' ? 'visit' : 'consultation'}` : ''}
        </Text>
      </View>

      {/* DateStrip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
        accessibilityRole="tablist"
        testID={childTestID(testID, 'dates')}
      >
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
              accessibilityLabel={`${new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}, ${
                none ? 'no appointments' : `${option.availableCount} appointments`
              }`}
              style={[
                styles.dateChip,
                {
                  borderRadius: theme.radii.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? health.colors.statusUpcoming : theme.colors.outlineVariant,
                  backgroundColor: selected ? health.colors.surfaceCalm : theme.colors.surface,
                  padding: theme.spacing.sm,
                },
              ]}
              testID={childTestID(testID, `date-${option.date}`)}
            >
              <View style={styles.center}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)}
                </Text>
                <Text variant="titleSmall" style={styles.tabular}>
                  {date.getDate()}
                </Text>
                {/* Availability count, not just a colour. */}
                <Text
                  variant="labelSmall"
                  style={{ color: none ? theme.colors.onSurfaceVariant : health.colors.statusReady }}
                >
                  {none ? 'None' : `${option.availableCount}`}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>

      {state === 'conflict' ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: health.colors.urgentSurface, borderRadius: theme.radii.md, padding: theme.spacing.sm },
          ]}
          accessibilityLiveRegion="assertive"
          testID={childTestID(testID, 'conflict')}
        >
          <Icon source="alert-circle-outline" size={16} color={health.colors.urgentAccent} />
          <Text variant="labelMedium" style={{ color: health.colors.onUrgentSurface, marginLeft: 6, flex: 1 }}>
            That time was just booked. Please choose another.
          </Text>
        </View>
      ) : null}

      {grouped.length === 0 ? (
        <StateView
          preset="empty"
          compact
          title="No appointments available on this day"
          description="Try another date, or join the waitlist to hear about cancellations."
          primaryAction={onJoinWaitlist ? { label: 'Join waitlist', onPress: onJoinWaitlist } : undefined}
          secondaryAction={onRefresh ? { label: 'Refresh', onPress: onRefresh } : undefined}
          testID={childTestID(testID, 'empty')}
        />
      ) : (
        grouped.map((group) => (
          <View key={group.period} style={{ gap: theme.spacing.sm }}>
            <Text variant="labelLarge" accessibilityRole="header">
              {PERIOD_LABEL[group.period]}
            </Text>
            <Animated.View style={[styles.slots, { gap: theme.spacing.sm }]} layout={motion.layout}>
              {group.slots.map((slot) => {
                const selected = slot.id === activeSlotId;
                const disabled = slot.status !== 'available';

                return (
                  <TouchableRipple
                    key={slot.id}
                    onPress={() => handleSelect(slot)}
                    disabled={disabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled }}
                    accessibilityLabel={`${formatTime(slot.start)}${
                      slot.fee ? `, ${formatMoney(slot.fee, { locale })}` : ''
                    }${disabled ? `, ${slot.status === 'held' ? 'temporarily held' : 'unavailable'}` : ''}`}
                    style={[
                      styles.slotChip,
                      {
                        minWidth: health.layout.slotChipMinWidth,
                        minHeight: health.layout.slotChipHeight,
                        borderRadius: theme.radii.md,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? health.colors.statusUpcoming : theme.colors.outlineVariant,
                        backgroundColor: selected ? health.colors.surfaceCalm : theme.colors.surface,
                        opacity: disabled ? 0.45 : 1,
                      },
                    ]}
                    testID={childTestID(testID, `slot-${slot.id}`)}
                  >
                    <View style={styles.center}>
                      <View style={[styles.row, { gap: 4 }]}>
                        {/* Selection carries a checkmark, not only a border. */}
                        {selected ? <Icon source="check" size={14} color={health.colors.statusUpcoming} /> : null}
                        <Text variant="bodyMedium" style={styles.tabular}>
                          {formatTime(slot.start)}
                        </Text>
                      </View>
                      {slot.fee ? (
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatMoney(slot.fee, { locale })}
                        </Text>
                      ) : null}
                      {slot.status === 'held' ? (
                        <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction }}>
                          Held
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

      {selectedSlot && onConfirm ? (
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={[
              styles.summary,
              { backgroundColor: health.colors.surfaceCalm, borderRadius: theme.radii.md, padding: theme.spacing.md },
            ]}
          >
            <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm }}>
              Selected
            </Text>
            <Text variant="titleSmall" style={{ color: health.colors.onSurfaceCalm }}>
              {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
                new Date(selectedSlot.start),
              )}{' '}
              at {formatTime(selectedSlot.start)}
            </Text>
            {selectedSlot.fee ? (
              <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm }}>
                {formatMoney(selectedSlot.fee, { locale })} · confirmed with your insurance at checkout
              </Text>
            ) : null}
          </View>

          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            loading={state === 'booking'}
            // Booking is never optimistic — availability is re-checked first.
            debounceMs={1200}
            onPress={() => onConfirm(selectedSlot)}
            testID={childTestID(testID, 'confirm')}
          >
            {state === 'booking' ? 'Checking availability…' : confirmLabel}
          </AppButton>
        </View>
      ) : null}

      {state === 'ready' && grouped.length > 0 && onRefresh ? (
        <View style={styles.center}>
          <ActivityIndicator animating={false} />
          <Text
            variant="labelSmall"
            onPress={onRefresh}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Refresh availability
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dateChip: { minWidth: 64 },
  slots: { flexDirection: 'row', flexWrap: 'wrap' },
  slotChip: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  notice: { flexDirection: 'row', alignItems: 'center' },
  summary: {},
  tabular: { fontVariant: ['tabular-nums'] },
});
