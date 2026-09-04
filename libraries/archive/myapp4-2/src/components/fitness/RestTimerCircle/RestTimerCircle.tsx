import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { RingProgress } from '../primitives/RingProgress';
import { useWellnessTheme } from '../theme/fitnessTokens';
import type { RestTimerStatus } from '../types/domain';

export interface RestTimerCircleProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  durationSeconds: number;
  remainingSeconds: number;
  status: RestTimerStatus;
  nextExerciseLabel?: string;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onAddTime?: (seconds: number) => void;
}

const formatSeconds = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}`;
};

/**
 * A calm ring during most of the rest window, shifting to an urgent accent
 * only in the final seconds — the numeric countdown is always the primary
 * signal, never the colour or the ring alone. Elapsed time should be
 * computed by the caller from a monotonic clock, not decremented once per
 * render, so backgrounding the app never desyncs the display.
 */
export const RestTimerCircle = ({ durationSeconds, remainingSeconds, status, nextExerciseLabel, onPause, onResume, onSkip, onAddTime, animated = true, style, containerStyle, testID }: RestTimerCircleProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'rest-timer-circle';
  const progress = durationSeconds > 0 ? remainingSeconds / durationSeconds : 0;
  const urgent = remainingSeconds <= 5 && status === 'running';
  const complete = status === 'complete';

  const a11yLabel = complete
    ? 'Rest complete'
    : status === 'paused'
      ? `Rest paused, ${remainingSeconds} seconds remaining`
      : `Rest remaining: ${remainingSeconds} seconds${nextExerciseLabel ? `, next: ${nextExerciseLabel}` : ''}`;

  return (
    <View style={[styles.root, containerStyle, style]} testID={id}>
      <RingProgress
        size={wellness.layout.restTimerSize}
        strokeWidth={14}
        animated={animated}
        rings={[
          {
            id: 'rest',
            progress: complete ? 1 : progress,
            color: urgent ? wellness.colors.restUrgent : wellness.colors.restCalm,
            trackColor: wellness.colors.ringTrack,
          },
        ]}
        testID={childTestID(id, 'ring')}
        center={
          <View style={styles.center} accessibilityRole="text" accessibilityLabel={a11yLabel} accessibilityLiveRegion={urgent || complete ? 'assertive' : 'none'}>
            {complete ? (
              <Icon source="check-circle" size={40} color={wellness.colors.success} />
            ) : (
              <Text variant="displaySmall" style={[styles.tabular, { color: urgent ? wellness.colors.restUrgent : theme.colors.onSurface }]}>
                {formatSeconds(remainingSeconds)}
              </Text>
            )}
            <Text variant="labelMedium" style={{ color: wellness.colors.onSurfaceVariant, marginTop: 4 }}>
              {complete ? 'Ready to start?' : status === 'paused' ? 'Paused' : 'Rest'}
            </Text>
          </View>
        }
      />

      {nextExerciseLabel && !complete ? (
        <Text variant="labelMedium" style={{ color: wellness.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
          Next: {nextExerciseLabel}
        </Text>
      ) : null}

      {!complete ? (
        <View style={[styles.controlsRow, { marginTop: theme.spacing.md }]}>
          {onAddTime ? (
            <TouchableRipple onPress={() => onAddTime(30)} accessibilityRole="button" accessibilityLabel="Add 30 seconds" testID={childTestID(id, 'add-time')}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                +30s
              </Text>
            </TouchableRipple>
          ) : null}

          <IconButton
            icon={status === 'paused' ? 'play' : 'pause'}
            size={28}
            mode="contained"
            onPress={status === 'paused' ? onResume : onPause}
            accessibilityLabel={status === 'paused' ? 'Resume timer' : 'Pause timer'}
            testID={childTestID(id, 'pause-resume')}
          />

          <TouchableRipple onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip rest" testID={childTestID(id, 'skip')}>
            <Text variant="labelMedium" style={{ color: wellness.colors.onSurfaceVariant }}>
              Skip
            </Text>
          </TouchableRipple>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  center: { alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
});
