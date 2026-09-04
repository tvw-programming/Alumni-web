import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useMotion, usePressAnimation, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { ServiceCategory } from '../types/domain';

export type CategoryTileVariant = 'grid' | 'image' | 'compact';

export interface ServiceCategoryTileProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  category: ServiceCategory;
  variant?: CategoryTileVariant;
  size?: number;
  onPress: (category: ServiceCategory) => void;
}

/**
 * A category entry point.
 *
 * Selection carries a border, a fill *and* the word — never a tint alone — and
 * an unavailable category stays visible with its reason rather than
 * disappearing, which is what actually tells someone the service exists but
 * isn't here yet.
 */
export const ServiceCategoryTile = memo(function ServiceCategoryTile({
  category,
  variant = 'grid',
  size,
  onPress,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: ServiceCategoryTileProps) {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const motion = useMotion({ animated });
  const state = category.state ?? 'default';
  const disabled = state === 'disabled' || !!category.unavailableReason;
  const selected = state === 'selected';

  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: disabled ? 'none' : 'scale',
    animated,
    scaleTo: 0.96,
  });

  const id = testID ?? `category-${category.id}`;
  const dimension = size ?? service.layout.categoryTileSize;
  const compact = variant === 'compact';

  const accessibleName = [
    category.label,
    category.count != null ? `${category.count} services` : undefined,
    category.isNew ? 'new' : undefined,
    category.badge,
    disabled ? category.unavailableReason ?? 'unavailable' : undefined,
    selected ? 'selected' : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  if (state === 'loading') {
    return (
      <View style={[compact ? styles.compactWrap : styles.gridWrap, containerStyle]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="circle" height={dimension * 0.7} />
        <SkeletonLoader shape="text" lines={1} width={dimension} height={10} containerStyle={{ marginTop: 6 }} />
      </View>
    );
  }

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      style={[compact ? styles.compactWrap : styles.gridWrap, containerStyle, animatedStyle]}
      testID={id}
    >
      <TouchableRipple
        onPress={disabled ? undefined : () => onPress(category)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        borderless
        style={[
          styles.surface,
          compact ? styles.compactSurface : styles.gridSurface,
          {
            borderRadius: theme.radii.lg,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? service.colors.statusAssigned : theme.colors.outlineVariant,
            backgroundColor: selected ? service.colors.surfaceSelected : theme.colors.surface,
            opacity: disabled ? 0.55 : 1,
          },
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibleName}
        accessibilityState={{ selected, disabled }}
        testID={childTestID(id, 'button')}
      >
        <View style={compact ? styles.compactContent : styles.gridContent}>
          <View
            style={[
              styles.iconWell,
              {
                width: dimension * 0.56,
                height: dimension * 0.56,
                borderRadius: theme.radii.pill,
                backgroundColor: selected ? theme.colors.surface : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Icon
              source={category.icon}
              size={dimension * 0.3}
              color={selected ? service.colors.statusAssigned : theme.colors.onSurfaceVariant}
            />
          </View>

          <View style={compact ? styles.compactLabels : styles.gridLabels}>
            <Text
              variant={compact ? 'bodyMedium' : 'labelMedium'}
              numberOfLines={2}
              style={[compact ? undefined : styles.centerText, { color: theme.colors.onSurface }]}
            >
              {category.label}
            </Text>
            {category.description ? (
              <Text
                variant="labelSmall"
                numberOfLines={1}
                style={[compact ? undefined : styles.centerText, { color: theme.colors.onSurfaceVariant }]}
              >
                {category.description}
              </Text>
            ) : null}
            {category.count != null && !disabled ? (
              <Text
                variant="labelSmall"
                style={[compact ? undefined : styles.centerText, { color: theme.colors.onSurfaceVariant }]}
              >
                {category.count} services
              </Text>
            ) : null}
            {disabled ? (
              <Text
                variant="labelSmall"
                style={[compact ? undefined : styles.centerText, { color: service.colors.unavailable }]}
                numberOfLines={2}
              >
                {category.unavailableReason ?? 'Unavailable'}
              </Text>
            ) : null}
          </View>

          {compact ? (
            <Icon source="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
          ) : null}
        </View>

        {(category.isNew || category.badge) && !disabled ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: service.colors.statusAssigned, borderRadius: theme.radii.sm },
            ]}
          >
            <Text variant="labelSmall" style={styles.badgeText}>
              {category.badge ?? 'New'}
            </Text>
          </View>
        ) : null}
      </TouchableRipple>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  gridWrap: { alignItems: 'center', width: 92 },
  compactWrap: { width: '100%' },
  surface: { overflow: 'hidden' },
  gridSurface: { width: '100%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
  compactSurface: { width: '100%' },
  gridContent: { alignItems: 'center' },
  compactContent: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  iconWell: { alignItems: 'center', justifyContent: 'center' },
  gridLabels: { alignItems: 'center', marginTop: 6, gap: 1 },
  compactLabels: { flex: 1, gap: 1 },
  centerText: { textAlign: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: '#FFFFFF', fontSize: 9 },
});
