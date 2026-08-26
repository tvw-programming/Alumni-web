import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { HabitDay, HabitDayState } from '../types/domain';

const STATE_META: Record<HabitDayState, { icon: string }> = {
  future: { icon: 'circle-outline' },
  complete: { icon: 'check-circle' },
  incomplete: { icon: 'circle-outline' },
  missed: { icon: 'close-circle-outline' },
  skipped: { icon: 'minus-circle-outline' },
  protected: { icon: 'shield-check-outline' },
};

export interface HabitCheckRowProps extends StyleEscapeHatches {
  label: string;
  days: HabitDay[];
  streakCount?: number;
  onToggleDay: (date: string) => void;
  onOpenDetails?: () => void;
  onAddReminder?: () => void;
}

/**
 * Every day is a real button with a full accessible label ("Monday,
 * completed") — never a coloured dot alone. A missed day is a fact, not a
 * failure; the streak count is never silently reset without the historical
 * record staying visible via `onOpenDetails`.
 */
export const HabitCheckRow = ({ label, days, streakCount, onToggleDay, onOpenDetails, onAddReminder, style, containerStyle, testID }: HabitCheckRowProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? `habit-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple onPress={onOpenDetails} disabled={!onOpenDetails} accessibilityRole={onOpenDetails ? 'button' : undefined} accessibilityLabel={onOpenDetails ? `${label} details` : undefined}>
        <View style={styles.headerRow}>
          <Text variant="titleSmall" style={styles.flex}>
            {label}
          </Text>
          {streakCount != null ? (
            <View style={styles.row}>
              <Icon source="fire" size={14} color={wellness.colors.streakActive} />
              <Text variant="labelMedium" style={{ color: wellness.colors.streakActive, marginLeft: 3 }}>
                {streakCount}-day streak
              </Text>
            </View>
          ) : null}
          {onAddReminder ? (
            <IconButton icon="bell-outline" size={16} onPress={onAddReminder} accessibilityLabel="Add reminder" style={styles.noMargin} testID={childTestID(id, 'reminder')} />
          ) : null}
        </View>
      </TouchableRipple>

      <View style={styles.daysRow}>
        {days.map((day) => {
          const meta = STATE_META[day.state];
          const dayOfWeek = new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' });
          const isToday = new Date(day.date).toDateString() === new Date().toDateString();
          const interactive = day.state !== 'future';
          const color =
            day.state === 'complete'
              ? wellness.colors.success
              : day.state === 'missed'
                ? wellness.colors.onSurfaceVariant
                : day.state === 'protected'
                  ? wellness.colors.streakProtected
                  : day.state === 'skipped'
                    ? wellness.colors.onSurfaceVariant
                    : wellness.colors.onSurfaceVariant;

          return (
            <TouchableRipple
              key={day.date}
              onPress={interactive ? () => onToggleDay(day.date) : undefined}
              disabled={!interactive}
              accessibilityRole="button"
              accessibilityLabel={`${dayOfWeek}${isToday ? ', today' : ''}, ${day.state}`}
              accessibilityState={{ disabled: !interactive, checked: day.state === 'complete' }}
              style={styles.dayCell}
              testID={childTestID(id, `day-${day.date}`)}
            >
              <View style={{ alignItems: 'center' }}>
                <Text variant="labelSmall" style={{ color: isToday ? theme.colors.primary : wellness.colors.onSurfaceVariant, fontWeight: isToday ? '700' : '400' }}>
                  {dayOfWeek.charAt(0)}
                </Text>
                <Icon source={meta.icon} size={20} color={day.state === 'future' ? wellness.colors.ringTrack : color} />
              </View>
            </TouchableRipple>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { padding: 4, borderRadius: 8 },
  noMargin: { margin: 0 },
});
