import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { LocationPoint, ScheduledRide } from '../types/domain';

const TIME_SLOTS = ['06:00', '07:00', '08:00', '09:00', '12:00', '15:00', '18:00', '19:00', '20:00', '21:00'];

export interface ScheduleRideSheetProps extends StyleEscapeHatches {
  visible: boolean;
  onDismiss: () => void;
  pickup?: LocationPoint;
  dropoff?: LocationPoint;
  ride: ScheduledRide;
  dateOptions: string[];
  minNoticeLabel?: string;
  maxAdvanceLabel?: string;
  locale?: string;
  submitting?: boolean;
  onChange: (ride: ScheduledRide) => void;
  onSchedule: () => void;
}

/**
 * Whether scheduling reserves a guaranteed vehicle or only creates an advance
 * request is stated outright, not implied by the confirmation copy — this
 * component never lets "Schedule ride" read as a guarantee the service does
 * not make.
 */
export const ScheduleRideSheet = ({
  visible,
  onDismiss,
  pickup,
  dropoff,
  ride,
  dateOptions,
  minNoticeLabel,
  maxAdvanceLabel,
  locale = 'en-IN',
  submitting = false,
  onChange,
  onSchedule,
  style,
  containerStyle,
  testID,
}: ScheduleRideSheetProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'schedule-ride-sheet';
  const [flightNumber, setFlightNumber] = useState(ride.flightNumber ?? '');

  const selectedDate = ride.scheduledAt?.slice(0, 10);
  const selectedTime = ride.scheduledAt?.slice(11, 16);

  const canSchedule = !!pickup && !!dropoff && !!selectedDate && !!selectedTime && ride.status !== 'unavailable';

  const setDate = (date: string) => {
    const time = selectedTime ?? '09:00';
    onChange({ ...ride, scheduledAt: `${date}T${time}:00` });
  };

  const setTime = (time: string) => {
    if (!selectedDate) return;
    onChange({ ...ride, scheduledAt: `${selectedDate}T${time}:00` });
  };

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title="Schedule a ride"
      scrollable
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <AppButton variant="primary" size="lg" fullWidth disabled={!canSchedule} loading={submitting} onPress={onSchedule} testID={childTestID(id, 'confirm')}>
          Schedule ride
        </AppButton>
      }
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <View style={{ gap: 2 }}>
          <RouteRow icon="circle-outline" label={pickup?.label ?? 'Pickup not set'} />
          <RouteRow icon="map-marker" label={dropoff?.label ?? 'Destination not set'} />
        </View>

        <View>
          <Text variant="labelMedium" style={{ marginBottom: 6 }}>
            Pick-up date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {dateOptions.map((date) => {
              const selected = date === selectedDate;
              const d = new Date(date);
              return (
                <TouchableRipple
                  key={date}
                  onPress={() => setDate(date)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d)}
                  style={[styles.chip, { borderRadius: theme.radii.md, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, borderWidth: selected ? 2 : StyleSheet.hairlineWidth }]}
                  testID={childTestID(id, `date-${date}`)}
                >
                  <View style={{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)}
                    </Text>
                    <Text variant="labelMedium">{d.getDate()}</Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Text variant="labelMedium" style={{ marginBottom: 6 }}>
            Pick-up time
          </Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const selected = time === selectedTime;
              return (
                <TouchableRipple
                  key={time}
                  onPress={() => setTime(time)}
                  disabled={!selectedDate}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: !selectedDate }}
                  style={[styles.timeChip, { borderRadius: theme.radii.pill, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, borderWidth: selected ? 2 : StyleSheet.hairlineWidth }]}
                  testID={childTestID(id, `time-${time}`)}
                >
                  <Text variant="labelMedium" style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                    {time}
                  </Text>
                </TouchableRipple>
              );
            })}
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="Flight number (optional)"
          value={flightNumber}
          onChangeText={(v) => {
            setFlightNumber(v);
            onChange({ ...ride, flightNumber: v });
          }}
          testID={childTestID(id, 'flight-number')}
        />

        {ride.schedulingFee ? <MoneyRow label="Scheduling fee" value={ride.schedulingFee} locale={locale} hint="Charged for reserving a driver in advance." /> : null}
        {ride.fare ? <MoneyRow label="Estimated fare" value={ride.fare} locale={locale} /> : null}

        <View style={[styles.notice, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}>
          <Icon source="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
            Your ride will be requested in advance. Driver assignment is not guaranteed until closer to pickup time.
            {minNoticeLabel ? ` Minimum notice: ${minNoticeLabel}.` : ''}
            {maxAdvanceLabel ? ` Book up to ${maxAdvanceLabel} ahead.` : ''}
          </Text>
        </View>

        {ride.status === 'unavailable' ? (
          <Text variant="labelSmall" style={{ color: theme.colors.error }} accessibilityLiveRegion="polite">
            No scheduled ride availability for this time. Try another slot.
          </Text>
        ) : null}
      </View>
    </AppSheet>
  );
};

const RouteRow = ({ icon, label }: { icon: string; label: string }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Icon source={icon} size={14} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodySmall" style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { overflow: 'hidden' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { overflow: 'hidden' },
  notice: { flexDirection: 'row', alignItems: 'center' },
});
