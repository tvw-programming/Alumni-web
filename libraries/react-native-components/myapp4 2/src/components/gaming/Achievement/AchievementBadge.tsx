import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { Achievement, AchievementRarity } from '../types/domain';

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export interface AchievementBadgeProps extends StyleEscapeHatches {
  achievement: Achievement;
  onPress?: (achievement: Achievement) => void;
}

/**
 * Rarity is never the only status cue — a rarity label always sits next to
 * the coloured accent. Hidden achievements show a locked silhouette and the
 * word "Hidden," never the real title or description, until earned.
 */
export const AchievementBadge = ({ achievement, onPress, style, containerStyle, testID }: AchievementBadgeProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `achievement-${achievement.id}`;
  const isHidden = achievement.status === 'hidden';
  const isLocked = achievement.status === 'locked';
  const isEarned = achievement.status === 'earned';
  const rarityColor = achievement.rarity
    ? gaming.colors[
        achievement.rarity === 'common' ? 'rarityCommon' : achievement.rarity === 'rare' ? 'rarityRare' : achievement.rarity === 'epic' ? 'rarityEpic' : 'rarityLegendary'
      ]
    : theme.colors.outlineVariant;

  const title = isHidden ? 'Hidden achievement' : achievement.title;
  const description = isHidden ? 'Keep playing to reveal this achievement.' : achievement.description;

  const a11yLabel = `${title}${achievement.rarity && !isHidden ? `, ${RARITY_LABEL[achievement.rarity]}` : ''}${
    isEarned ? `, earned${achievement.earnedAt ? ` ${achievement.earnedAt}` : ''}` : isLocked ? ', locked' : achievement.status === 'inProgress' ? `, ${achievement.progressLabel ?? 'in progress'}` : ''
  }`;

  return (
    <TouchableRipple
      onPress={onPress ? () => onPress(achievement) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11yLabel}
      style={[styles.root, { borderColor: rarityColor, borderRadius: theme.radii.md, opacity: isLocked ? 0.55 : 1 }, containerStyle, style]}
      testID={id}
    >
      <View style={{ padding: theme.spacing.sm, alignItems: 'center', gap: 4 }}>
        <View style={[styles.iconWrap, { width: gaming.layout.badgeIconSize, height: gaming.layout.badgeIconSize, backgroundColor: theme.colors.surfaceVariant, borderRadius: gaming.layout.badgeIconSize / 2 }]}>
          {achievement.icon?.uri && !isLocked && !isHidden ? (
            <Image source={{ uri: achievement.icon.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
          ) : (
            <Icon source={isHidden ? 'help' : isLocked ? 'lock-outline' : 'trophy-outline'} size={20} color={theme.colors.onSurfaceVariant} />
          )}
        </View>

        <Text variant="labelMedium" numberOfLines={2} style={styles.title}>
          {title}
        </Text>

        {!isHidden && description ? (
          <Text variant="labelSmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {description}
          </Text>
        ) : null}

        {achievement.status === 'inProgress' && achievement.progress != null ? (
          <View style={{ width: '100%', gap: 2 }}>
            <ProgressBar
              progress={achievement.progress}
              color={gaming.colors.statusInProgress}
              style={{ height: 4, borderRadius: theme.radii.pill, backgroundColor: gaming.colors.progressTrack }}
            />
            {achievement.progressLabel ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                {achievement.progressLabel}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isEarned && achievement.earnedAt ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.statusEarned }}>
            Earned {achievement.earnedAt}
          </Text>
        ) : null}

        {achievement.rarity && !isHidden && !isLocked ? (
          <View style={styles.row}>
            <Icon source="star-four-points" size={10} color={rarityColor} />
            <Text variant="labelSmall" style={{ color: rarityColor, marginLeft: 3 }}>
              {RARITY_LABEL[achievement.rarity]}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  root: { borderWidth: 1.5, overflow: 'hidden' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
