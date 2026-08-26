import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useLearnTheme } from '../theme/educationTokens';

/** Khan Academy's range. Products can narrow it; they should not widen it silently. */
export const DEFAULT_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export const formatSpeed = (speed: number): string => (speed === 1 ? 'Normal' : `${speed}x`);

export interface PlaybackSpeedMenuProps {
  visible: boolean;
  onDismiss: () => void;
  speed: number;
  speeds?: readonly number[];
  onChange: (speed: number) => void;
  /** Persisting the choice across lectures is the expected behaviour. */
  rememberChoice?: boolean;
  onToggleRemember?: (next: boolean) => void;
  testID?: string;
}

/**
 * Speed selection as a bottom sheet.
 *
 * A sheet rather than an overlay menu specifically so it cannot cover the
 * captions — obscuring captions to change speed is a bad trade for the learners
 * most likely to be adjusting speed in the first place.
 */
export const PlaybackSpeedMenu = ({
  visible,
  onDismiss,
  speed,
  speeds = DEFAULT_SPEEDS,
  onChange,
  rememberChoice,
  onToggleRemember,
  testID,
}: PlaybackSpeedMenuProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title="Playback speed"
      testID={testID}
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Playback speed"
        style={{ gap: 2 }}
      >
        {speeds.map((option) => {
          const selected = option === speed;
          return (
            <TouchableRipple
              key={option}
              onPress={() => {
                onChange(option);
                onDismiss();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatSpeed(option)} playback speed`}
              testID={childTestID(testID, `speed-${option}`)}
            >
              <View
                style={[
                  styles.option,
                  { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radii.md },
                  selected && { backgroundColor: learn.colors.surfaceSelected },
                ]}
              >
                {/* Selection carries a checkmark, not only a tint. */}
                <View style={styles.checkWell}>
                  {selected ? <Icon source="check" size={18} color={learn.colors.statusInProgress} /> : null}
                </View>
                <Text
                  variant="bodyLarge"
                  style={{ color: selected ? learn.colors.onSurfaceSelected : theme.colors.onSurface }}
                >
                  {formatSpeed(option)}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      {onToggleRemember ? (
        <TouchableRipple
          onPress={() => onToggleRemember(!rememberChoice)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!rememberChoice }}
          accessibilityLabel="Use this speed for future lessons"
          testID={childTestID(testID, 'remember')}
        >
          <View style={[styles.option, { paddingVertical: theme.spacing.sm, gap: theme.spacing.xs }]}>
            <Icon
              source={rememberChoice ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={rememberChoice ? learn.colors.statusInProgress : theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium">Use this speed for future lessons</Text>
          </View>
        </TouchableRipple>
      ) : null}
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center' },
  checkWell: { width: 28 },
});
