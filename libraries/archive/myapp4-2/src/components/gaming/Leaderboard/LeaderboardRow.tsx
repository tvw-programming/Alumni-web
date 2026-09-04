import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Surface, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { LeaderboardEntry } from '../types/domain';

export interface LeaderboardRowProps extends StyleEscapeHatches {
  entry: LeaderboardEntry;
  onPress?: (playerId: string) => void;
}

/**
 * Rank, movement and score are always plain text, never encoded only in
 * height or a medal icon — the podium is a visual bonus on top of this same
 * accessible row, not a replacement for it.
 */
export const LeaderboardRow = ({ entry, onPress, style, containerStyle, testID }: LeaderboardRowProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `leaderboard-row-${entry.playerId}`;
  const hidden = entry.status === 'hidden';
  const underReview = entry.status === 'underReview';

  const movementIcon = entry.movement === 'up' ? 'arrow-up-bold' : entry.movement === 'down' ? 'arrow-down-bold' : 'minus';
  const movementColor = entry.movement === 'up' ? gaming.colors.success : entry.movement === 'down' ? gaming.colors.critical : theme.colors.onSurfaceVariant;

  const a11yLabel = `Rank ${entry.rank}${entry.isCurrentPlayer ? ', you' : ''}, ${entry.displayName}, ${entry.scoreLabel}${
    entry.movement ? `, ${entry.movement === 'up' ? 'promoted' : entry.movement === 'down' ? 'dropped' : 'no change'}` : ''
  }${underReview ? ', under anti-cheat review' : ''}`;

  return (
    <Surface
      elevation={entry.isCurrentPlayer ? 1 : 0}
      style={[
        styles.root,
        { backgroundColor: entry.isCurrentPlayer ? gaming.colors.surfaceSelected : 'transparent', borderRadius: theme.radii.md },
        containerStyle,
        style,
      ]}
    >
      <TouchableRipple onPress={onPress ? () => onPress(entry.playerId) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} testID={id}>
        <View style={[styles.row, { padding: theme.spacing.sm }]}>
          <Text variant="titleSmall" style={styles.rank}>
            {entry.rank}
          </Text>

          {entry.avatar?.uri ? <Avatar.Image size={36} source={{ uri: entry.avatar.uri }} /> : <Avatar.Text size={36} label={initialsOf(entry.displayName)} />}

          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ color: entry.isCurrentPlayer ? gaming.colors.onSurfaceSelected : theme.colors.onSurface }}>
              {entry.isCurrentPlayer ? 'You' : entry.displayName}
              {entry.clanTag ? ` [${entry.clanTag}]` : ''}
            </Text>
            {underReview ? (
              <Text variant="labelSmall" style={{ color: gaming.colors.warning }}>
                Under anti-cheat review
              </Text>
            ) : hidden ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Hidden
              </Text>
            ) : null}
          </View>

          <View style={styles.scoreBlock}>
            <Text variant="titleSmall">{entry.scoreLabel}</Text>
            {entry.movement && entry.movement !== 'same' ? (
              <View style={styles.row}>
                <Icon source={movementIcon} size={12} color={movementColor} />
                <Text variant="labelSmall" style={{ color: movementColor, marginLeft: 2 }}>
                  {entry.movement === 'up' ? 'Promoted' : 'Dropped'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  rank: { width: 28, textAlign: 'center' },
  scoreBlock: { alignItems: 'flex-end' },
});
