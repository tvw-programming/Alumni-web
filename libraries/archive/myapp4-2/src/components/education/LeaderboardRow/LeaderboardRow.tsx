import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { LeaderboardEntry, Movement } from '../types/domain';

const MOVEMENT_META: Record<Movement, { label: string; icon: string; colorKey: 'rankUp' | 'rankDown' | 'rankSame' }> = {
  up: { label: 'moved up', icon: 'arrow-up', colorKey: 'rankUp' },
  down: { label: 'moved down', icon: 'arrow-down', colorKey: 'rankDown' },
  same: { label: 'unchanged', icon: 'minus', colorKey: 'rankSame' },
};

export interface LeaderboardRowProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  entry: LeaderboardEntry;
  /** "XP" or "points" — used consistently across the product. */
  pointsLabel?: string;
  loading?: boolean;
  onPress?: (entry: LeaderboardEntry) => void;
  /** Promotion / demotion boundary marker rendered above this row. */
  boundary?: { label: string; kind: 'promotion' | 'demotion' };
}

/**
 * A single leaderboard row.
 *
 * The whole row reads as one sentence to a screen reader — "8th place, Priya N.,
 * 340 XP, moved up two places" — because rank colour and a medal glyph carry no
 * information without sight. Learners who opted out appear as "Hidden", and
 * anonymous entries never leak a display name.
 *
 * Rank measures points earned this period. It is not a measure of ability, and
 * the copy in this library never implies otherwise.
 */
export const LeaderboardRow = memo(function LeaderboardRow({
  entry,
  pointsLabel = 'XP',
  loading = false,
  onPress,
  boundary,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: LeaderboardRowProps) {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `rank-${entry.userId}`;
  const movement = entry.movement ? MOVEMENT_META[entry.movement] : null;
  const hidden = entry.privacyMode === 'hidden';
  const anonymous = entry.privacyMode === 'anonymous';

  const name = hidden ? 'Hidden' : anonymous ? `Learner ${entry.rank}` : entry.displayName;

  const accessibleName = useMemo(
    () =>
      [
        `${entry.rank}${['th', 'st', 'nd', 'rd'][((entry.rank % 100) - 20) % 10] ?? (['th', 'st', 'nd', 'rd'][entry.rank] ?? 'th')} place`,
        entry.isCurrentUser ? 'you' : name,
        `${entry.points.toLocaleString()} ${pointsLabel}`,
        movement?.label,
        entry.tiedWith ? `tied with ${entry.tiedWith} other learners` : undefined,
      ]
        .filter(Boolean)
        .join(', '),
    [entry, movement, name, pointsLabel],
  );

  if (loading) {
    return (
      <View style={[styles.row, { padding: theme.spacing.sm, gap: theme.spacing.sm }, containerStyle]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={1} width={24} height={14} />
        <SkeletonLoader shape="circle" height={32} />
        <View style={styles.flex}>
          <SkeletonLoader shape="text" lines={1} width="55%" height={12} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View entering={motion.entering(entering, index)} layout={motion.layout} style={containerStyle} testID={id}>
      {boundary ? (
        <View style={[styles.boundary, { borderColor: boundary.kind === 'promotion' ? learn.colors.rankUp : learn.colors.rankDown }]}>
          <Text
            variant="labelSmall"
            style={{
              color: boundary.kind === 'promotion' ? learn.colors.rankUp : learn.colors.rankDown,
              backgroundColor: theme.colors.background,
              paddingHorizontal: theme.spacing.xs,
            }}
          >
            {boundary.label}
          </Text>
        </View>
      ) : null}

      <TouchableRipple
        onPress={onPress && !hidden ? () => onPress(entry) : undefined}
        disabled={!onPress || hidden}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={accessibleName}
        testID={childTestID(id, 'row')}
      >
        <View
          style={[
            styles.row,
            {
              padding: theme.spacing.sm,
              gap: theme.spacing.sm,
              // Current user carries a border AND a label, not just a tint.
              backgroundColor: entry.isCurrentUser ? learn.colors.surfaceSelected : 'transparent',
              borderLeftWidth: entry.isCurrentUser ? 3 : 0,
              borderLeftColor: learn.colors.rankCurrentUser,
            },
            style,
          ]}
        >
          <Text variant="titleSmall" style={[styles.rank, styles.tabular]}>
            {entry.rank}
          </Text>

          {hidden ? (
            <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
              <Icon source="eye-off-outline" size={16} color={theme.colors.onSurfaceVariant} />
            </View>
          ) : entry.avatar?.uri && !anonymous ? (
            <Image
              source={{ uri: entry.avatar.uri }}
              style={[styles.avatar, { borderRadius: theme.radii.pill }]}
              accessibilityElementsHidden
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
              <Text variant="labelSmall">{anonymous ? '?' : initialsOf(entry.displayName)}</Text>
            </View>
          )}

          <View style={styles.flex}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {name}
              {entry.isCurrentUser ? ' · You' : ''}
            </Text>
            {entry.tiedWith ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tied with {entry.tiedWith} other{entry.tiedWith === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>

          {movement ? (
            <View style={[styles.row, { gap: 2 }]}>
              <Icon source={movement.icon} size={12} color={learn.colors[movement.colorKey]} />
            </View>
          ) : null}

          <Text variant="labelLarge" style={[styles.points, styles.tabular]}>
            {entry.points.toLocaleString()}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {' '}
              {pointsLabel}
            </Text>
          </Text>
        </View>
      </TouchableRipple>
    </Animated.View>
  );
});

export interface LeaderboardHeaderProps {
  title: string;
  /** "New leaderboard period starts Monday." */
  periodNote?: string;
  /** Shown when the learner has not qualified yet. */
  unrankedNote?: string;
  onOpenPrivacy?: () => void;
  testID?: string;
}

/** Period context and the always-available privacy escape hatch. */
export const LeaderboardHeader = ({
  title,
  periodNote,
  unrankedNote,
  onOpenPrivacy,
  testID,
}: LeaderboardHeaderProps) => {
  const theme = useAppTheme();
  return (
    <View style={{ padding: theme.spacing.md, gap: 2 }} testID={testID}>
      <View style={styles.row}>
        <Text variant="titleSmall" style={styles.flex} accessibilityRole="header">
          {title}
        </Text>
        {onOpenPrivacy ? (
          <Text
            variant="labelSmall"
            onPress={onOpenPrivacy}
            accessibilityRole="button"
            accessibilityLabel="Leaderboard privacy settings"
            style={{ color: theme.colors.primary }}
          >
            Privacy
          </Text>
        ) : null}
      </View>
      {periodNote ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {periodNote}
        </Text>
      ) : null}
      {unrankedNote ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {unrankedNote}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rank: { width: 28, textAlign: 'center' },
  avatar: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  points: { minWidth: 76, textAlign: 'right' },
  boundary: { borderTopWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 6, marginBottom: -6 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
