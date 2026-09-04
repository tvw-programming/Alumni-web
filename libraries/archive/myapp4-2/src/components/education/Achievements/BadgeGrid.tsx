import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppSheet } from '@ui/organisms/AppSheet';
import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { StateView } from '@ui/molecules/StateView';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { Badge } from '../types/domain';

export interface BadgeGridProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  badges: Badge[];
  locale?: string;
  loading?: boolean;
  columns?: number;
  showFilters?: boolean;
  onBadgePress?: (badge: Badge) => void;
}

/**
 * Achievement badges.
 *
 * Every badge is described in text — the icon is never the only description —
 * and locked badges show honest progress toward the next milestone rather than
 * a mystery. Hidden badges reveal that they exist without spoiling the criteria.
 */
export const BadgeGrid = ({
  badges,
  locale = 'en-IN',
  loading = false,
  columns = 3,
  showFilters = true,
  onBadgePress,
  animated = true,
  style,
  containerStyle,
  testID,
}: BadgeGridProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const [filters, setFilters] = useState<string[]>([]);
  const [detail, setDetail] = useState<Badge | null>(null);

  const categories = useMemo(() => {
    const set = new Set(badges.map((badge) => badge.category).filter(Boolean) as string[]);
    return [...set].map((category) => ({ key: category, label: category }));
  }, [badges]);

  const visible = useMemo(
    () => (filters.length === 0 ? badges : badges.filter((badge) => badge.category && filters.includes(badge.category))),
    [badges, filters],
  );

  const earnedCount = badges.filter((badge) => badge.earned).length;

  if (loading) {
    return (
      <View style={[styles.grid, containerStyle]} testID={childTestID(testID, 'loading')}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={{ width: `${100 / columns}%`, padding: theme.spacing.xs, alignItems: 'center' }}>
            <SkeletonLoader shape="circle" height={learn.layout.badgeSize} />
            <SkeletonLoader shape="text" lines={1} width="70%" height={10} containerStyle={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    );
  }

  if (badges.length === 0) {
    return (
      <StateView
        preset="empty"
        compact
        title="No badges yet"
        description="Badges appear here as you complete lessons and reach milestones."
        containerStyle={containerStyle}
        testID={childTestID(testID, 'empty')}
      />
    );
  }

  return (
    <View style={[{ gap: theme.spacing.sm }, containerStyle, style]} testID={testID}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {earnedCount} of {badges.length} badges earned
      </Text>

      {showFilters && categories.length > 1 ? (
        <FilterChipGroup
          items={categories}
          selected={filters}
          onChange={setFilters}
          showClearAll
          animated={animated}
          testID={childTestID(testID, 'filters')}
        />
      ) : null}

      <View style={styles.grid}>
        {visible.map((badge, index) => {
          const locked = !badge.earned;
          const color = badge.earned ? learn.colors.badgeEarned : learn.colors.badgeLocked;

          /** Full description in the accessible name — icons describe nothing. */
          const label = [
            badge.hidden && locked ? 'Hidden badge' : badge.title,
            badge.earned
              ? `earned ${badge.earnedAt ? formatRelativeDate(badge.earnedAt, locale) : ''}`
              : badge.hidden
                ? 'Keep learning to discover this one'
                : `not yet earned. ${badge.progressLabel ?? badge.description}`,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <Animated.View
              key={badge.id}
              entering={motion.entering('scale', index)}
              style={{ width: `${100 / columns}%`, padding: theme.spacing.xs }}
            >
              <TouchableRipple
                onPress={() => {
                  setDetail(badge);
                  onBadgePress?.(badge);
                }}
                borderless
                style={{ borderRadius: theme.radii.md, padding: theme.spacing.xs }}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: badge.earned }}
                testID={childTestID(testID, `badge-${badge.id}`)}
              >
                <View style={styles.badgeCell}>
                  <View
                    style={[
                      styles.badgeIcon,
                      {
                        width: learn.layout.badgeSize,
                        height: learn.layout.badgeSize,
                        borderRadius: theme.radii.pill,
                        backgroundColor: badge.earned ? learn.colors.rewardSurface : theme.colors.surfaceVariant,
                        borderColor: color,
                      },
                    ]}
                  >
                    <Icon
                      source={badge.hidden && locked ? 'help' : badge.icon}
                      size={28}
                      color={color}
                    />
                    {locked && !badge.hidden ? (
                      <View style={[styles.lockPip, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill }]}>
                        <Icon source="lock" size={10} color={theme.colors.onSurfaceVariant} />
                      </View>
                    ) : null}
                  </View>

                  {/* Title in text under every badge. */}
                  <Text
                    variant="labelSmall"
                    numberOfLines={2}
                    style={{
                      textAlign: 'center',
                      marginTop: 4,
                      color: badge.earned ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {badge.hidden && locked ? 'Hidden' : badge.title}
                  </Text>

                  {locked && badge.progress != null && !badge.hidden ? (
                    <ProgressBar
                      progress={badge.progress}
                      color={learn.colors.progressValue}
                      style={{ height: 3, borderRadius: theme.radii.pill, width: '80%', marginTop: 3 }}
                      accessibilityLabel={badge.progressLabel ?? `${Math.round(badge.progress * 100)} percent toward this badge`}
                    />
                  ) : null}
                </View>
              </TouchableRipple>
            </Animated.View>
          );
        })}
      </View>

      <AppSheet
        visible={!!detail}
        onDismiss={() => setDetail(null)}
        variant="bottom"
        title={detail?.hidden && !detail?.earned ? 'Hidden badge' : detail?.title}
        animated={animated}
        testID={childTestID(testID, 'detail')}
      >
        {detail ? (
          <View style={[styles.center, { gap: theme.spacing.sm }]}>
            <View
              style={[
                styles.badgeIcon,
                {
                  width: learn.layout.badgeSize + 16,
                  height: learn.layout.badgeSize + 16,
                  borderRadius: theme.radii.pill,
                  backgroundColor: detail.earned ? learn.colors.rewardSurface : theme.colors.surfaceVariant,
                  borderColor: detail.earned ? learn.colors.badgeEarned : learn.colors.badgeLocked,
                },
              ]}
            >
              <Icon
                source={detail.hidden && !detail.earned ? 'help' : detail.icon}
                size={34}
                color={detail.earned ? learn.colors.badgeEarned : learn.colors.badgeLocked}
              />
            </View>

            <Text variant="bodyMedium" style={styles.centerText}>
              {detail.hidden && !detail.earned
                ? 'Keep learning — this one reveals itself when you earn it.'
                : detail.description}
            </Text>

            {detail.earned ? (
              <Text variant="labelSmall" style={{ color: learn.colors.statusCompleted }}>
                Earned {detail.earnedAt ? formatRelativeDate(detail.earnedAt, locale) : ''}
              </Text>
            ) : detail.progressLabel ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {detail.progressLabel}
              </Text>
            ) : null}
          </View>
        ) : null}
      </AppSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  badgeCell: { alignItems: 'center' },
  badgeIcon: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  lockPip: { position: 'absolute', bottom: -2, right: -2, padding: 2 },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
});
