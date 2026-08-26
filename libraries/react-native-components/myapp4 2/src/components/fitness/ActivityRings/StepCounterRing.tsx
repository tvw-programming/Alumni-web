import React from 'react';
import { Text } from 'react-native-paper';

import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { RingProgress } from '../primitives/RingProgress';
import { useWellnessTheme } from '../theme/fitnessTokens';
import type { RingStatus } from '../types/domain';

export interface StepCounterRingProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  steps: number;
  goal: number;
  status?: RingStatus;
  size?: number;
}

/**
 * A single-metric convenience over `ActivityRings` — the same ring renderer,
 * sized down and reduced to one value, for a step count shown on its own
 * (e.g. a dashboard tile) rather than alongside Move/Exercise/Stand.
 */
export const StepCounterRing = ({ steps, goal, status = 'active', size, animated = true, style, containerStyle, testID }: StepCounterRingProps) => {
  const wellness = useWellnessTheme();
  const id = testID ?? 'step-counter-ring';
  const ringSize = size ?? wellness.layout.ringSizeSmall;
  const unavailable = status === 'unavailable';
  const progress = unavailable ? 0 : Math.min(1, steps / Math.max(1, goal));

  return (
    <RingProgress
      size={ringSize}
      strokeWidth={ringSize > 100 ? 12 : 6}
      animated={animated}
      rings={[{ id: 'steps', progress, color: unavailable ? wellness.colors.ringTrack : wellness.colors.ringExercise, trackColor: wellness.colors.ringTrack }]}
      testID={childTestID(id, 'ring')}
      center={
        <Text
          variant={ringSize > 100 ? 'titleMedium' : 'labelSmall'}
          accessibilityRole="text"
          accessibilityLabel={unavailable ? 'Steps: data unavailable' : `Steps: ${steps.toLocaleString()} of ${goal.toLocaleString()}, ${Math.round(progress * 100)} percent complete`}
        >
          {unavailable ? '—' : steps.toLocaleString()}
        </Text>
      }
    />
  );
};
