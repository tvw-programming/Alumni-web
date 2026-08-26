import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';

import { useSocialTheme } from '../theme/socialTokens';
import type { StoryItem } from '../types/domain';

export interface StoryRingProps {
  item: StoryItem;
  size?: number;
  onPress?: (item: StoryItem) => void;
  onRetryUpload?: (item: StoryItem) => void;
  testID?: string;
}

/**
 * A single story avatar.
 *
 * The gradient ring is decoration only. Unseen status, live status and audience
 * are all carried in the accessible label *and* in the caption beneath the
 * avatar, because a ring colour is invisible to a screen reader and ambiguous
 * to anyone with a colour-vision difference.
 */
export const StoryRing = memo(function StoryRing({
  item,
  size,
  onPress,
  onRetryUpload,
  testID,
}: StoryRingProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const [failed, setFailed] = useState(false);

  const id = testID ?? `story-${item.id}`;
  const dimension = size ?? social.layout.storyRingSize;
  const stroke = social.layout.storyRingStroke;
  const radius = (dimension - stroke) / 2;
  const inner = dimension - stroke * 4;

  const uploading = item.uploadState === 'uploading';
  const uploadFailed = item.uploadState === 'failed';

  const ringColor = item.isLive
    ? social.colors.storyLiveRing
    : item.audience === 'closeFriends'
      ? social.colors.storyCloseFriends
      : item.hasUnseen
        ? undefined // gradient
        : social.colors.storySeenRing;

  /** The whole state as one sentence. */
  const label = item.isOwn
    ? uploading
      ? 'Your story, uploading'
      : uploadFailed
        ? 'Your story failed to upload. Double tap to retry.'
        : 'Add to your story'
    : [
        `Story from ${item.user.displayName}`,
        item.isLive ? 'live now' : undefined,
        item.hasUnseen
          ? `${item.segmentCount ?? 1} new ${item.segmentCount === 1 ? 'segment' : 'segments'}`
          : 'already seen',
        item.audience === 'closeFriends' ? 'close friends only' : undefined,
        item.sponsored ? 'sponsored' : undefined,
        item.expired ? 'expired' : undefined,
      ]
        .filter(Boolean)
        .join(', ');

  return (
    <View style={styles.wrap} testID={id}>
      <TouchableRipple
        onPress={uploadFailed && onRetryUpload ? () => onRetryUpload(item) : onPress ? () => onPress(item) : undefined}
        disabled={(!onPress && !uploadFailed) || item.expired}
        borderless
        style={{ borderRadius: theme.radii.pill }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: item.expired }}
        testID={childTestID(id, 'button')}
      >
        <View style={{ width: dimension, height: dimension, opacity: item.expired ? 0.45 : 1 }}>
          <Svg width={dimension} height={dimension} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Defs>
              <LinearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={social.colors.storyUnseenRing} />
                <Stop offset="1" stopColor={social.colors.storyUnseenRingAlt} />
              </LinearGradient>
            </Defs>
            <Circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              stroke={ringColor ?? `url(#grad-${item.id})`}
              strokeWidth={item.hasUnseen || item.isLive ? stroke : stroke * 0.7}
              strokeDasharray={
                // Segment ticks make the count visible, not just implied.
                item.segmentCount && item.segmentCount > 1 && item.hasUnseen
                  ? `${(2 * Math.PI * radius) / item.segmentCount - 4} 4`
                  : undefined
              }
              fill="none"
            />
          </Svg>

          <View style={[StyleSheet.absoluteFill, styles.center]}>
            {item.user.avatar?.uri && !failed ? (
              <Image
                source={{ uri: item.user.avatar.uri }}
                style={{ width: inner, height: inner, borderRadius: theme.radii.pill }}
                onError={() => setFailed(true)}
              />
            ) : (
              <View
                style={[
                  styles.center,
                  { width: inner, height: inner, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                {item.isOwn ? (
                  <Icon source="plus" size={inner * 0.42} color={theme.colors.onSurfaceVariant} />
                ) : (
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {initialsOf(item.user.displayName)}
                  </Text>
                )}
              </View>
            )}

            {uploading ? (
              <View style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
                <ActivityIndicator size={16} color="#FFFFFF" />
              </View>
            ) : null}

            {uploadFailed ? (
              <View style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
                <Icon source="alert-circle" size={20} color="#FFFFFF" />
              </View>
            ) : null}
          </View>

          {/* Live is a labelled badge, not just a red ring. */}
          {item.isLive ? (
            <View
              style={[
                styles.liveBadge,
                { backgroundColor: social.colors.storyLiveRing, borderRadius: theme.radii.sm, borderColor: theme.colors.surface },
              ]}
            >
              <Text variant="labelSmall" style={styles.liveText}>
                LIVE
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableRipple>

      {/* The caption repeats the state in words. */}
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={[
          styles.caption,
          {
            width: dimension + 8,
            color: item.hasUnseen && !item.isOwn ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
          },
        ]}
      >
        {item.isOwn ? 'Your story' : item.user.displayName}
      </Text>

      {!item.isOwn && item.hasUnseen ? (
        <Text variant="labelSmall" style={{ color: social.colors.statusUnread, fontSize: 9 }}>
          New
        </Text>
      ) : null}

      {uploadFailed ? (
        <Text variant="labelSmall" style={{ color: social.colors.statusError, fontSize: 9 }}>
          Retry
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999 },
  liveBadge: { position: 'absolute', bottom: -2, alignSelf: 'center', paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1.5 },
  liveText: { color: '#FFFFFF', fontSize: 8, letterSpacing: 0.5 },
  caption: { textAlign: 'center' },
});
