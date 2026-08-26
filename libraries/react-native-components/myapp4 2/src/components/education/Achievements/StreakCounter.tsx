import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { StreakData } from '../types/domain';

export interface StreakCounterProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  streak: StreakData;
  locale?: string;
  onSetReminder?: () => void;
  onStartLesson?: () => void;
  /** Calm, private presentation — no flame, no urgency. */
  restrained?: boolean;
  compact?: boolean;
}

/**
 * Daily streak.
 *
 * The copy rules matter more than the visuals here: a streak celebrates
 * consistency ("You're on a 7-day streak") and never threatens loss ("Don't
 * break your streak!"). A reset streak keeps the longest-ever record visible,
 * because the learning did not disappear when the counter did.
 *
 * `restrained` switches to the Headspace-style private treatment for contexts
 * where competitive pressure is counterproductive.
 */
export const StreakCounter = ({
  streak,
  locale = 'en-IN',
  onSetReminder,
  onStartLesson,
  restrained = false,
  compact = false,
  animated = true,
  style,
  containerStyle,
  testID,
}: StreakCounterProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const id = testID ?? 'streak';
  const broken = streak.current === 0;

  const accentColor = broken
    ? learn.colors.streakRested
    : restrained
      ? learn.colors.statusInProgress
      : streak.atRisk
        ? learn.colors.streakAtRisk
        : learn.colors.streakActive;

  const headline = useMemo(() => {
    if (broken) return 'Your streak reset';
    return `${streak.current}-day streak`;
  }, [broken, streak.current]);

  /** Encouraging, never shaming. */
  const message = useMemo(() => {
    if (broken) return `You can rebuild it today. Your longest streak of ${streak.longest} days is still yours.`;
    if (streak.goalProgress >= 1) return "Today's goal is done. Nice and steady.";
    if (streak.atRisk) return `${streak.goalLabel} to keep it going today.`;
    return streak.goalLabel;
  }, [broken, streak]);

  const weekday = (iso: string) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(`${iso}T00:00:00`));

  return (
    <AppCard
      variant="outlined"
      containerStyle={containerStyle}
      style={[!restrained && !broken ? { backgroundColor: learn.colors.rewardSurface } : undefined, style]}
      testID={id}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={[styles.row, { gap: theme.spacing.sm }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${headline}. ${message} Longest streak ${streak.longest} days.`}
        >
          <Animated.View entering={motion.entering('scale')}>
            <Icon
              source={restrained ? 'calendar-check' : broken ? 'calendar-blank-outline' : 'fire'}
              size={compact ? 24 : 32}
              color={accentColor}
            />
          </Animated.View>

          <View style={styles.flex}>
            <Text variant={compact ? 'titleSmall' : 'titleMedium'} style={{ color: accentColor }}>
              {headline}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {message}
            </Text>
          </View>

          {/* Historical achievement survives a reset. */}
          <View style={styles.alignEnd}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Longest
            </Text>
            <Text variant="titleSmall" style={styles.tabular}>
              {streak.longest}
            </Text>
          </View>
        </View>

        {!compact ? (
          <>
            <ProgressBar
              progress={Math.max(0, Math.min(1, streak.goalProgress))}
              color={accentColor}
              style={{ height: 6, borderRadius: theme.radii.pill }}
              accessibilityLabel={`Today's goal, ${Math.round(streak.goalProgress * 100)} percent complete`}
            />

            <View style={styles.week} accessibilityRole="list" accessibilityLabel="This week's activity">
              {streak.history.slice(-7).map((day) => (
                <View key={day.date} style={styles.dayColumn}>
                  <View
                    style={[
                      styles.dayDot,
                      {
                        borderRadius: theme.radii.pill,
                        backgroundColor: day.met
                          ? accentColor
                          : day.frozen
                            ? learn.colors.streakRested
                            : 'transparent',
                        borderColor: day.met || day.frozen ? 'transparent' : theme.colors.outlineVariant,
                      },
                    ]}
                    accessible
                    accessibilityLabel={`${weekday(day.date)}: ${
                      day.met ? 'goal met' : day.frozen ? 'rest day used' : 'no activity'
                    }`}
                  >
                    {day.met ? <Icon source="check" size={11} color="#FFFFFF" /> : null}
                    {day.frozen && !day.met ? <Icon source="snowflake" size={11} color="#FFFFFF" /> : null}
                  </View>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {weekday(day.date)}
                  </Text>
                </View>
              ))}
            </View>

            {streak.freezesAvailable ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {streak.freezesAvailable} rest day{streak.freezesAvailable === 1 ? '' : 's'} available — use one when you
                need a break.
              </Text>
            ) : null}

            <View style={[styles.actions, { gap: theme.spacing.sm }]}>
              {onStartLesson && streak.goalProgress < 1 ? (
                <AppButton
                  variant="primary"
                  size="sm"
                  containerStyle={styles.flex}
                  onPress={onStartLesson}
                  testID={childTestID(id, 'start')}
                >
                  Start a lesson
                </AppButton>
              ) : null}
              {onSetReminder ? (
                <AppButton variant="ghost" size="sm" icon="bell-outline" onPress={onSetReminder} testID={childTestID(id, 'reminder')}>
                  Remind me
                </AppButton>
              ) : null}
            </View>
          </>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayColumn: { alignItems: 'center', gap: 2 },
  dayDot: { width: 22, height: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  alignEnd: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
