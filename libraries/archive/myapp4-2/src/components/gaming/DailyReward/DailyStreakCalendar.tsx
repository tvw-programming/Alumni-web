import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { RewardDay, RewardDayStatus } from '../types/domain';

const STATUS_ICON: Record<RewardDayStatus, string> = {
  locked: 'lock-outline',
  available: 'gift-outline',
  claimed: 'check-circle',
  missed: 'close-circle-outline',
  protected: 'shield-check-outline',
};

export interface DailyStreakCalendarProps extends StyleEscapeHatches {
  days: RewardDay[];
  streakCount: number;
  onSelectDay?: (day: RewardDay) => void;
}

/**
 * A missed day renders as a fact, not a failure — no shame-based copy, and
 * the historical streak count stays visible even after a reset rather than
 * quietly zeroing out with no explanation.
 */
export const DailyStreakCalendar = ({ days, streakCount, onSelectDay, style, containerStyle, testID }: DailyStreakCalendarProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? 'daily-streak-calendar';
  const available = days.find((d) => d.status === 'available');

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <Icon source="fire" size={18} color={gaming.colors.currencyCoins} />
        <Text variant="titleSmall" style={{ marginLeft: 6 }}>
          {streakCount}-day streak
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: theme.spacing.sm }}>
        {days.map((day) => {
          const disabled = day.status === 'locked';
          const claimed = day.status === 'claimed';
          const missed = day.status === 'missed';
          const isAvailable = day.status === 'available';
          const color = claimed
            ? gaming.colors.statusEarned
            : missed
              ? theme.colors.onSurfaceVariant
              : day.status === 'protected'
                ? gaming.colors.statusInProgress
                : isAvailable
                  ? gaming.colors.rarityLegendary
                  : theme.colors.onSurfaceVariant;

          return (
            <TouchableRipple
              key={day.day}
              onPress={onSelectDay && !disabled ? () => onSelectDay(day) : undefined}
              disabled={disabled || !onSelectDay}
              accessibilityRole={onSelectDay && !disabled ? 'button' : 'text'}
              accessibilityLabel={`Day ${day.day}, ${day.reward.quantity} ${day.reward.label}, ${day.status}`}
              style={[
                styles.dayCell,
                {
                  borderRadius: theme.radii.md,
                  borderColor: isAvailable ? gaming.colors.rarityLegendary : theme.colors.outlineVariant,
                  borderWidth: isAvailable ? 2 : StyleSheet.hairlineWidth,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              testID={childTestID(id, `day-${day.day}`)}
            >
              <View style={{ padding: theme.spacing.sm, alignItems: 'center', gap: 2 }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Day {day.day}
                </Text>
                <Icon source={STATUS_ICON[day.status]} size={20} color={color} />
                <Text variant="labelSmall" numberOfLines={1} style={{ color }}>
                  {day.reward.quantity}× {day.reward.label}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </ScrollView>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.xs }}>
        {available ? `Day ${available.day} reward ready to claim.` : 'Come back tomorrow for your next reward.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  dayCell: { minWidth: 76, overflow: 'hidden' },
});
