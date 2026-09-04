import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Chip, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { WorkoutCardData, WorkoutDifficulty, WorkoutState } from '../types/domain';

const DIFFICULTY_LABEL: Record<WorkoutDifficulty, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

const STATE_META: Partial<Record<WorkoutState, { label: string; icon: string }>> = {
  inProgress: { label: 'In progress', icon: 'play-circle-outline' },
  completed: { label: 'Completed', icon: 'check-circle' },
  scheduled: { label: 'Scheduled', icon: 'calendar-clock-outline' },
  locked: { label: 'Subscription required', icon: 'lock-outline' },
};

export interface WorkoutCardProps extends StyleEscapeHatches {
  workout: WorkoutCardData;
  onPress: (workout: WorkoutCardData) => void;
  onPrimaryAction?: (workout: WorkoutCardData) => void;
  onSchedule?: (workout: WorkoutCardData) => void;
}

/**
 * A calorie estimate is always labelled as an estimate — the card never
 * implies it's a guaranteed burn. Difficulty, equipment, and lock state all
 * come from the catalog/entitlement service; this card only ever renders
 * what it's handed.
 */
export const WorkoutCard = ({ workout, onPress, onPrimaryAction, onSchedule, style, containerStyle, testID }: WorkoutCardProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? `workout-${workout.id}`;
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>(workout.image?.uri ? 'loading' : 'error');
  const meta = workout.state ? STATE_META[workout.state] : undefined;
  const locked = workout.state === 'locked';

  const a11yLabel = `${workout.title}, ${workout.type}, ${workout.durationLabel}${workout.difficulty ? `, ${DIFFICULTY_LABEL[workout.difficulty]}` : ''}${meta ? `, ${meta.label}` : ''}`;

  return (
    <AppCard variant="outlined" padded={false} containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={() => onPress(workout)} accessibilityRole="button" accessibilityLabel={a11yLabel}>
        <View>
          <View style={[styles.cover, { backgroundColor: wellness.colors.surfaceVariant }]}>
            {workout.image?.uri && imgStatus !== 'error' ? (
              <Image
                source={{ uri: workout.image.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onLoad={() => setImgStatus('loaded')}
                onError={() => setImgStatus('error')}
                accessibilityElementsHidden
              />
            ) : (
              <View style={styles.coverFallback}>
                <Icon source="dumbbell" size={26} color={wellness.colors.onSurfaceVariant} />
              </View>
            )}

            {meta ? (
              <View style={[styles.stateBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <Icon source={meta.icon} size={12} color="#FFFFFF" />
                <Text variant="labelSmall" style={{ color: '#FFFFFF', marginLeft: 4 }}>
                  {meta.label}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ padding: theme.spacing.sm, gap: 4 }}>
            <Text variant="titleSmall" numberOfLines={1}>
              {workout.title}
            </Text>
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              {workout.type}
            </Text>

            <View style={styles.chipRow}>
              <Chip compact mode="outlined" style={styles.chip} textStyle={styles.chipText}>
                {workout.durationLabel}
              </Chip>
              {workout.difficulty ? (
                <Chip compact mode="outlined" style={styles.chip} textStyle={styles.chipText}>
                  {DIFFICULTY_LABEL[workout.difficulty]}
                </Chip>
              ) : null}
              {workout.equipmentLabel ? (
                <Chip compact mode="outlined" style={styles.chip} textStyle={styles.chipText}>
                  {workout.equipmentLabel}
                </Chip>
              ) : null}
            </View>

            {workout.caloriesLabel ? (
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                Estimated {workout.caloriesLabel}
              </Text>
            ) : null}

            <View style={styles.actionRow}>
              {onSchedule && workout.state !== 'scheduled' && !locked ? (
                <AppButton variant="ghost" size="sm" onPress={() => onSchedule(workout)} testID={childTestID(id, 'schedule')}>
                  Add to plan
                </AppButton>
              ) : null}
              {onPrimaryAction ? (
                <AppButton
                  variant="primary"
                  size="sm"
                  disabled={locked}
                  containerStyle={styles.flex}
                  onPress={() => onPrimaryAction(workout)}
                  testID={childTestID(id, 'primary')}
                >
                  {workout.state === 'inProgress' ? 'Resume' : workout.state === 'completed' ? 'Preview' : 'Start workout'}
                </AppButton>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  cover: { width: '100%', aspectRatio: 1.6, overflow: 'hidden' },
  coverFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  stateBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { height: 26 },
  chipText: { fontSize: 11, marginVertical: 0, lineHeight: 14 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  flex: { flex: 1 },
});
