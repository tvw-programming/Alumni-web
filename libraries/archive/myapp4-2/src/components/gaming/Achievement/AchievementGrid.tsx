import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { FilterChipGroup } from '@ui/molecules/FilterChipGroup';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { Achievement, AchievementStatus } from '../types/domain';
import { AchievementBadge } from './AchievementBadge';

const FILTERS: { key: AchievementStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'earned', label: 'Earned' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'locked', label: 'Locked' },
];

export interface AchievementGridProps extends StyleEscapeHatches {
  achievements: Achievement[];
  columns?: number;
  onPressAchievement?: (achievement: Achievement) => void;
}

/**
 * Filtering happens client-side over an already-normalized list — entitlement
 * truth (what's actually earned) always comes from the achievement service,
 * this grid only ever changes what's currently visible.
 */
export const AchievementGrid = ({ achievements, columns = 3, onPressAchievement, style, containerStyle, testID }: AchievementGridProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'achievement-grid';
  const [filter, setFilter] = useState<AchievementStatus | 'all'>('all');

  const filtered = useMemo(() => (filter === 'all' ? achievements : achievements.filter((a) => a.status === filter)), [achievements, filter]);

  const earnedCount = achievements.filter((a) => a.status === 'earned').length;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {earnedCount} of {achievements.length} earned
        </Text>
      </View>

      <FilterChipGroup
        items={FILTERS.map((f) => ({ key: f.key, label: f.label }))}
        selected={[filter]}
        onChange={(next) => setFilter((next[0] as AchievementStatus | 'all') ?? 'all')}
        mode="single"
        containerStyle={{ marginVertical: theme.spacing.sm }}
        testID={childTestID(id, 'filters')}
      />

      {filtered.length === 0 ? (
        <StateView preset="empty" compact title="No achievements here" description="Try a different filter." />
      ) : (
        <FlatList
          data={filtered}
          key={columns}
          numColumns={columns}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 / columns }}>
              <AchievementBadge achievement={item} onPress={onPressAchievement} />
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
});
