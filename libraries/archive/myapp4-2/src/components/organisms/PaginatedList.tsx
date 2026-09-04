import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { FlashList, type ContentStyle, type ListRenderItem } from '@shopify/flash-list';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { useMotion, useStableCallback, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';

import { SkeletonList, type SkeletonShape } from '../atoms/Skeleton';
import { StateView, type StateViewProps } from '../molecules/StateView';
import { ScrollOffsetProvider } from './AppFAB';
import type { StyleEscapeHatches } from '../primitives';

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList,
) as unknown as typeof FlashList;

export interface PaginatedListProps<T>
  extends StyleEscapeHatches,
    Pick<AnimatableProps, 'animated' | 'entering'> {
  data: T[] | undefined;
  renderItem: ListRenderItem<T>;
  keyExtractor?: (item: T, index: number) => string;
  estimatedItemSize: number;

  /** Initial load — renders skeletons, not a spinner. */
  loading?: boolean;
  /** Loading the *next* page — renders a footer spinner. */
  loadingMore?: boolean;
  error?: unknown;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;

  /** Overrides for the three built-in states. */
  emptyState?: Partial<StateViewProps>;
  errorState?: Partial<StateViewProps>;
  skeletonCount?: number;
  skeletonShape?: SkeletonShape;

  header?: React.ReactElement | null;
  footer?: React.ReactElement | null;
  numColumns?: number;
  /** Publish scroll offset so a FAB / SearchHeader can react to it. */
  trackScroll?: boolean;
}

/**
 * Owns loading / empty / error so screens stay thin.
 *
 * A screen that renders this has no `if (isLoading) return <Spinner/>` in it —
 * which is exactly the duplication this library exists to delete.
 */
export function PaginatedList<T>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize,
  loading = false,
  loadingMore = false,
  error,
  onRetry,
  refreshing = false,
  onRefresh,
  onEndReached,
  hasMore = false,
  emptyState,
  errorState,
  skeletonCount = 6,
  skeletonShape = 'listItem',
  header,
  footer,
  numColumns,
  trackScroll = false,
  animated = true,
  entering = 'slideUp',
  containerStyle,
  style,
  testID,
}: PaginatedListProps<T>) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const scrollOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const handleEndReached = useStableCallback(onEndReached);

  /**
   * Stagger the first page only. Running entry animations during pagination
   * makes an infinite list look like it is constantly rebuilding itself.
   */
  const wrappedRenderItem = useCallback<ListRenderItem<T>>(
    (info) => {
      const isFirstPage = info.index < 10;
      return (
        <Animated.View entering={isFirstPage ? motion.entering(entering, info.index) : undefined}>
          {renderItem(info)}
        </Animated.View>
      );
    },
    [entering, motion, renderItem],
  );

  const listFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={[styles.footer, { padding: theme.spacing.lg }]}>
          <ActivityIndicator testID={testID ? `${testID}-loading-more` : undefined} />
        </View>
      );
    }
    if (!hasMore && (data?.length ?? 0) > 0) {
      return (
        <View style={[styles.footer, { padding: theme.spacing.lg }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            You have reached the end
          </Text>
        </View>
      );
    }
    return footer ?? null;
  }, [data?.length, footer, hasMore, loadingMore, testID, theme]);

  // ---- The three states the screen no longer has to think about -------------
  if (loading && !data?.length) {
    return (
      <View style={[styles.flex, { padding: theme.spacing.md }, containerStyle]}>
        {header}
        <SkeletonList of={skeletonShape} count={skeletonCount} testID={testID ? `${testID}-skeleton` : undefined} />
      </View>
    );
  }

  if (error && !data?.length) {
    return (
      <View style={[styles.flex, containerStyle]}>
        {header}
        <StateView
          preset="error"
          primaryAction={onRetry ? { label: 'Try again', onPress: onRetry } : undefined}
          testID={testID ? `${testID}-error` : undefined}
          {...errorState}
        />
      </View>
    );
  }

  return (
    <ScrollOffsetProvider value={scrollOffset}>
      <View style={[styles.flex, containerStyle]}>
        <AnimatedFlashList
          data={data ?? []}
          renderItem={wrappedRenderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={estimatedItemSize}
          numColumns={numColumns}
          onScroll={trackScroll ? scrollHandler : undefined}
          scrollEventThrottle={16}
          onEndReached={hasMore ? handleEndReached : undefined}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={header}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <StateView preset="empty" testID={testID ? `${testID}-empty` : undefined} {...emptyState} />
          }
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            ) : undefined
          }
          // FlashList narrows this to padding-only `ContentStyle`; the escape
          // hatch on our side is a normal ViewStyle.
          contentContainerStyle={style as ContentStyle}
          keyboardShouldPersistTaps="handled"
          testID={testID}
        />
      </View>
    </ScrollOffsetProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { alignItems: 'center', justifyContent: 'center' },
});
