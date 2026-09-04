import React from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';

export interface ContentCarouselProps<T> extends StyleEscapeHatches {
  title: string;
  subtitle?: string;
  items: T[];
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement;
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onSeeAll?: () => void;
  cardWidth: number;
  skeletonCount?: number;
}

/**
 * A generic rail — it never knows whether its children are movies, episodes,
 * podcasts, or live channels. Skeletons preserve the real card width so
 * loading never causes the row to reflow once content arrives.
 */
export function ContentCarousel<T>({
  title,
  subtitle,
  items,
  renderItem,
  keyExtractor,
  loading = false,
  emptyMessage = 'No titles available.',
  onSeeAll,
  cardWidth,
  skeletonCount = 4,
  style,
  containerStyle,
  testID,
}: ContentCarouselProps<T>) {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? `content-carousel-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="titleMedium" accessibilityRole="header" style={{ color: media.colors.onSurface }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onSeeAll ? (
          <TouchableRipple onPress={onSeeAll} accessibilityRole="button" accessibilityLabel={`See all ${title}`} testID={childTestID(id, 'see-all')}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              See all
            </Text>
          </TouchableRipple>
        ) : null}
      </View>

      {loading ? (
        <FlatList
          horizontal
          data={Array.from({ length: skeletonCount })}
          keyExtractor={(_, index) => `skeleton-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: media.layout.carouselCardGap, paddingVertical: theme.spacing.sm }}
          renderItem={() => <SkeletonLoader shape="rect" height={cardWidth * 1.5} containerStyle={{ width: cardWidth }} />}
        />
      ) : items.length === 0 ? (
        <StateView preset="empty" compact title={emptyMessage} />
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: media.layout.carouselCardGap, paddingVertical: theme.spacing.sm }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  flex: { flex: 1 },
});
