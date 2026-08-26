import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { resolveIntent, useAppTheme, type Intent } from '@/theme';
import { childTestID } from '@/utils';

import { AppButton } from '../atoms/AppButton';
import type { StyleEscapeHatches } from '../primitives';

/**
 * Empty, error, offline and no-results are the same layout with different
 * copy — so they are one component with presets, not four components that
 * drift apart over time.
 */
export type StatePreset = 'empty' | 'error' | 'offline' | 'noResults' | 'success';

interface PresetConfig {
  icon: string;
  intent: Intent;
  title: string;
  description: string;
}

const PRESETS: Record<StatePreset, PresetConfig> = {
  empty: {
    icon: 'inbox-outline',
    intent: 'neutral',
    title: 'Nothing here yet',
    description: 'When there is something to show, it will appear here.',
  },
  error: {
    icon: 'alert-circle-outline',
    intent: 'error',
    title: 'Something went wrong',
    description: 'We could not load this. Please try again.',
  },
  offline: {
    icon: 'wifi-off',
    intent: 'warning',
    title: 'You are offline',
    description: 'Check your connection and try again.',
  },
  noResults: {
    icon: 'magnify',
    intent: 'neutral',
    title: 'No matches',
    description: 'Try a different search or clear your filters.',
  },
  success: {
    icon: 'check-circle-outline',
    intent: 'success',
    title: 'All done',
    description: 'Everything is up to date.',
  },
};

export interface StateAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
}

export interface StateViewProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering'> {
  preset?: StatePreset;
  /** Overrides for the preset's copy. */
  title?: string;
  description?: string;
  /** Replace the icon entirely — a Lottie, an SVG, whatever. */
  illustration?: React.ReactNode;
  primaryAction?: StateAction;
  secondaryAction?: StateAction;
  compact?: boolean;
}

export const StateView = forwardRef<View, StateViewProps>(function StateView(
  {
    preset = 'empty',
    title,
    description,
    illustration,
    primaryAction,
    secondaryAction,
    compact = false,
    animated = true,
    entering = 'fade',
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const config = PRESETS[preset];
  const colors = useMemo(() => resolveIntent(theme, config.intent), [config.intent, theme]);

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering)}
      style={[
        styles.root,
        { padding: compact ? theme.spacing.lg : theme.spacing.xl, gap: theme.spacing.sm },
        containerStyle,
        style,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${title ?? config.title}. ${description ?? config.description}`}
      testID={testID}
    >
      {illustration ?? (
        <View
          style={[
            styles.iconWell,
            { backgroundColor: colors.container, borderRadius: theme.radii.pill, padding: theme.spacing.md },
          ]}
        >
          <Icon source={config.icon} size={compact ? 28 : 40} color={colors.onContainer} />
        </View>
      )}

      <Text variant={compact ? 'titleSmall' : 'titleMedium'} style={styles.center}>
        {title ?? config.title}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.center, { color: theme.colors.onSurfaceVariant }]}
        testID={childTestID(testID, 'description')}
      >
        {description ?? config.description}
      </Text>

      {(primaryAction || secondaryAction) && (
        <View style={[styles.actions, { marginTop: theme.spacing.sm, gap: theme.spacing.sm }]}>
          {primaryAction && (
            <AppButton
              variant="primary"
              onPress={primaryAction.onPress}
              loading={primaryAction.loading}
              testID={childTestID(testID, 'primary-action')}
            >
              {primaryAction.label}
            </AppButton>
          )}
          {secondaryAction && (
            <AppButton
              variant="ghost"
              onPress={secondaryAction.onPress}
              loading={secondaryAction.loading}
              testID={childTestID(testID, 'secondary-action')}
            >
              {secondaryAction.label}
            </AppButton>
          )}
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  iconWell: { alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
