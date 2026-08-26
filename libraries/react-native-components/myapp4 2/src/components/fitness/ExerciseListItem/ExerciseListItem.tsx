import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Checkbox, Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { ExerciseItem, ExerciseStatus } from '../types/domain';

const STATUS_META: Partial<Record<ExerciseStatus, { label: string; icon: string }>> = {
  skipped: { label: 'Skipped', icon: 'debug-step-over' },
  substituted: { label: 'Substituted', icon: 'swap-horizontal' },
};

export interface ExerciseListItemProps extends StyleEscapeHatches {
  exercise: ExerciseItem;
  onPress?: (exercise: ExerciseItem) => void;
  onComplete?: (exercise: ExerciseItem) => void;
  onEdit?: (exercise: ExerciseItem) => void;
  onReplace?: (exercise: ExerciseItem) => void;
}

const formatPrescription = (exercise: ExerciseItem) => {
  const { sets, reps, durationSeconds, weightLabel } = exercise.prescription;
  const parts: string[] = [];
  if (sets && reps != null) parts.push(`${sets} sets × ${reps} reps`);
  else if (reps != null) parts.push(`${reps} reps`);
  if (durationSeconds != null) parts.push(`${durationSeconds}s`);
  if (weightLabel) parts.push(weightLabel);
  return parts.join(' · ');
};

/**
 * The thumbnail is always secondary to the name and prescription in text —
 * an animated GIF is never the only source of instruction, and a screen
 * reader gets the full prescription without needing to see the media.
 */
export const ExerciseListItem = ({ exercise, onPress, onComplete, onEdit, onReplace, style, containerStyle, testID }: ExerciseListItemProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? `exercise-${exercise.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const meta = STATUS_META[exercise.status];
  const completed = exercise.status === 'completed';
  const active = exercise.status === 'active';
  const prescriptionText = formatPrescription(exercise);

  const a11yLabel = `${exercise.name}${prescriptionText ? `, ${prescriptionText}` : ''}${exercise.status === 'completed' ? ', completed' : meta ? `, ${meta.label}` : ''}`;

  return (
    <TouchableRipple
      onPress={onPress ? () => onPress(exercise) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11yLabel}
      style={[styles.root, active ? { backgroundColor: wellness.colors.surfaceVariant, borderRadius: theme.radii.sm } : undefined, containerStyle, style]}
      testID={id}
    >
      <View style={styles.row}>
        <View style={[styles.thumb, { width: wellness.layout.exerciseThumbSize, height: wellness.layout.exerciseThumbSize, backgroundColor: wellness.colors.surfaceVariant, borderRadius: wellness.layout.exerciseThumbSize / 2 }]}>
          {exercise.thumbnail?.uri ? (
            <Image source={{ uri: exercise.thumbnail.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
          ) : (
            <Icon source="run" size={18} color={wellness.colors.onSurfaceVariant} />
          )}
        </View>

        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <Text variant="bodyMedium" numberOfLines={2} style={{ textDecorationLine: exercise.status === 'skipped' ? 'line-through' : 'none' }}>
            {exercise.name}
            {exercise.isSuperset ? ' (superset)' : ''}
          </Text>
          {prescriptionText ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              {prescriptionText}
            </Text>
          ) : null}
          {exercise.muscleGroup ? (
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              {exercise.muscleGroup}
            </Text>
          ) : null}
          {meta ? (
            <View style={styles.metaRow}>
              <Icon source={meta.icon} size={12} color={wellness.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant, marginLeft: 3 }}>
                {meta.label}
              </Text>
            </View>
          ) : null}
          {exercise.personalBest ? (
            <View style={styles.metaRow}>
              <Icon source="trophy-outline" size={12} color={wellness.colors.accent} />
              <Text variant="labelSmall" style={{ color: wellness.colors.accent, marginLeft: 3 }}>
                New personal best
              </Text>
            </View>
          ) : null}
        </View>

        {onComplete ? (
          <Checkbox
            status={completed ? 'checked' : 'unchecked'}
            onPress={() => onComplete(exercise)}
            testID={childTestID(id, 'complete')}
          />
        ) : null}

        {(onEdit || onReplace) ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${exercise.name}`} style={styles.noMargin} testID={childTestID(id, 'menu')} />}
          >
            {onEdit ? <Menu.Item onPress={() => { setMenuVisible(false); onEdit(exercise); }} title="View instructions" leadingIcon="information-outline" /> : null}
            {onReplace ? <Menu.Item onPress={() => { setMenuVisible(false); onReplace(exercise); }} title="Replace exercise" leadingIcon="swap-horizontal" /> : null}
          </Menu>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  root: { paddingVertical: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  noMargin: { margin: 0 },
});
