import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { StreakStatus } from '../types/domain';

export interface StreakFlameProps extends StyleEscapeHatches {
  currentDays: number;
  longestDays?: number;
  status?: StreakStatus;
  milestoneLabel?: string;
  onPress?: () => void;
}

/**
 * A broken streak resets `currentDays` but never erases `longestDays` — the
 * historical best stays visible and celebrated rather than being replaced by
 * a discouraging "0". No moral framing in the copy either way.
 */
export const StreakFlame = ({ currentDays, longestDays, status = 'active', milestoneLabel, onPress, style, containerStyle, testID }: StreakFlameProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'streak-flame';
  const broken = status === 'broken';

  const color = broken ? wellness.colors.streakBroken : status === 'protected' ? wellness.colors.streakProtected : wellness.colors.streakActive;
  const icon = broken ? 'fire-off' : status === 'paused' ? 'pause-circle-outline' : 'fire';

  const a11yLabel = `${currentDays}-day streak${status !== 'active' ? `, ${status}` : ''}${longestDays ? `, longest streak ${longestDays} days` : ''}`;

  return (
    <TouchableRipple onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} style={[containerStyle, style]} testID={id}>
      <View style={styles.row}>
        <Icon source={icon} size={24} color={color} />
        <View style={{ marginLeft: 8 }}>
          <Text variant="titleSmall" style={{ color: broken ? wellness.colors.onSurfaceVariant : theme.colors.onSurface }}>
            {currentDays}-day streak
          </Text>
          {longestDays != null ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              Longest streak: {longestDays} days
            </Text>
          ) : null}
          {status === 'protected' ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.streakProtected }}>
              Streak protected
            </Text>
          ) : status === 'paused' ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              Paused
            </Text>
          ) : milestoneLabel ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.streakActive }}>
              {milestoneLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
