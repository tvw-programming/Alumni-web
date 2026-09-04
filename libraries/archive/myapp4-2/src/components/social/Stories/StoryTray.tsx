import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSocialTheme } from '../theme/socialTokens';
import type { StoryItem } from '../types/domain';
import { StoryRing } from './StoryRing';

export interface StoryTrayProps extends StyleEscapeHatches {
  items: StoryItem[];
  loading?: boolean;
  onPressStory?: (item: StoryItem) => void;
  onRetryUpload?: (item: StoryItem) => void;
  ringSize?: number;
}

/** Horizontally scrollable story rail with a summary for assistive tech. */
export const StoryTray = memo(function StoryTray({
  items,
  loading = false,
  onPressStory,
  onRetryUpload,
  ringSize,
  style,
  containerStyle,
  testID,
}: StoryTrayProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const unseenCount = items.filter((item) => item.hasUnseen && !item.isOwn).length;

  if (loading) {
    return (
      <View
        style={[styles.row, { padding: theme.spacing.md, gap: theme.spacing.md }, containerStyle]}
        testID={childTestID(testID, 'loading')}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={{ alignItems: 'center', gap: 4 }}>
            <SkeletonLoader shape="circle" height={ringSize ?? social.layout.storyRingSize} />
            <SkeletonLoader shape="text" lines={1} width={44} height={8} />
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <StateView
        preset="empty"
        compact
        title="No stories available"
        description="Stories from people you follow will appear here."
        containerStyle={containerStyle}
        testID={childTestID(testID, 'empty')}
      />
    );
  }

  return (
    <View style={[{ backgroundColor: social.colors.surfaceFeed }, containerStyle, style]} testID={testID}>
      {/* Count summary so the rail is understandable without scrolling it. */}
      <Text
        variant="labelSmall"
        style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm }}
        accessibilityLiveRegion="polite"
      >
        {unseenCount > 0 ? `${unseenCount} new ${unseenCount === 1 ? 'story' : 'stories'}` : 'No new stories'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        accessibilityRole="list"
        accessibilityLabel={`Stories, ${unseenCount} unseen`}
      >
        {items.map((item) => (
          <StoryRing
            key={item.id}
            item={item}
            size={ringSize}
            onPress={onPressStory}
            onRetryUpload={onRetryUpload}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
