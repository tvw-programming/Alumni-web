import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSheet } from '@ui/organisms/AppSheet';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { SocialAvatar } from '../primitives/SocialAvatar';
import { useSocialTheme } from '../theme/socialTokens';
import type { StoryItem, StorySegment } from '../types/domain';

export interface StoryViewerProps extends Pick<AnimatableProps, 'animated'> {
  visible: boolean;
  onDismiss: () => void;
  item: StoryItem;
  segments: StorySegment[];
  startIndex?: number;
  onSegmentChange?: (index: number) => void;
  onReply?: (item: StoryItem, text: string) => void;
  onReport?: (item: StoryItem) => void;
  testID?: string;
}

/**
 * Full-screen story playback.
 *
 * Auto-advance exists, but it is always pausable and every gesture has an
 * explicit button equivalent — timed content that can only be paused by holding
 * a finger on the screen excludes anyone using a switch device or keyboard.
 * With reduced motion the progress bar snaps rather than sweeping, and segment
 * changes are announced.
 */
export const StoryViewer = ({
  visible,
  onDismiss,
  item,
  segments,
  startIndex = 0,
  onSegmentChange,
  onReply,
  onReport,
  animated = true,
  testID,
}: StoryViewerProps) => {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const motion = useMotion({ animated });
  const insets = useSafeAreaInsets();

  const id = testID ?? 'story-viewer';
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  const segment = segments[Math.min(index, segments.length - 1)];
  const progress = useSharedValue(0);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= segments.length) {
        onDismiss();
        return;
      }
      setIndex(next);
      setFailed(false);
      onSegmentChange?.(next);
      const target = segments[next];
      if (target) {
        AccessibilityInfo.announceForAccessibility(
          `Segment ${next + 1} of ${segments.length}. ${target.caption ?? target.media.alt}`,
        );
      }
    },
    [onDismiss, onSegmentChange, segments],
  );

  useEffect(() => {
    if (!visible || !segment) return;
    progress.value = 0;
    if (paused || !motion.enabled) {
      // With reduced motion or while paused the bar does not sweep.
      progress.value = paused ? progress.value : 0;
      return;
    }
    progress.value = withTiming(1, { duration: segment.durationMs });
    const timer = setTimeout(() => goTo(index + 1), segment.durationMs);
    return () => clearTimeout(timer);
  }, [goTo, index, motion.enabled, paused, progress, segment, visible]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  if (!segment) return null;

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="fullscreen"
      showHandle={false}
      animated={animated}
      testID={id}
    >
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        {/* Segment progress — one bar per segment, filled/current/upcoming. */}
        <View style={[styles.progressRow, { paddingTop: insets.top + 8, gap: 3 }]}>
          {segments.map((entry, position) => (
            <View key={entry.id} style={[styles.progressTrack, { borderRadius: theme.radii.pill }]}>
              {position < index ? (
                <View style={[styles.progressFill, { width: '100%', borderRadius: theme.radii.pill }]} />
              ) : position === index ? (
                <Animated.View style={[styles.progressFill, barStyle, { borderRadius: theme.radii.pill }]} />
              ) : null}
            </View>
          ))}
        </View>

        <View style={[styles.header, { gap: 8 }]}>
          <SocialAvatar user={item.user} size={32} />
          <View style={styles.flex}>
            <Text variant="labelMedium" style={styles.onDark} numberOfLines={1}>
              {item.user.displayName}
            </Text>
            <Text variant="labelSmall" style={styles.onDarkMuted}>
              Segment {index + 1} of {segments.length}
              {item.audience === 'closeFriends' ? ' · Close friends' : ''}
            </Text>
          </View>

          {/* Explicit pause — never gesture-only. */}
          <ViewerButton
            icon={paused ? 'play' : 'pause'}
            label={paused ? 'Resume story' : 'Pause story'}
            onPress={() => setPaused((prev) => !prev)}
            testID={childTestID(id, 'pause')}
          />
          {onReport ? (
            <ViewerButton icon="flag-outline" label="Report this story" onPress={() => onReport(item)} testID={childTestID(id, 'report')} />
          ) : null}
          <ViewerButton icon="close" label="Close story" onPress={onDismiss} testID={childTestID(id, 'close')} />
        </View>

        <View style={styles.stage}>
          {failed ? (
            <View style={[styles.center, { padding: 24 }]}>
              <Icon source="image-off-outline" size={30} color="#FFFFFF" />
              <Text variant="labelMedium" style={[styles.onDark, { marginTop: 8, textAlign: 'center' }]}>
                {segment.media.alt}
              </Text>
              <Text variant="labelSmall" style={[styles.onDarkMuted, { marginTop: 4 }]}>
                Media unavailable
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: segment.media.src }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              onError={() => setFailed(true)}
              accessible
              accessibilityLabel={segment.caption ?? segment.media.alt}
            />
          )}

          {segment.caption ? (
            <View style={[styles.caption, { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: theme.radii.md }]}>
              <Text variant="bodySmall" style={styles.onDark}>
                {segment.caption}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Previous / next as real buttons, alongside the tap zones. */}
        <View style={[styles.nav, { paddingBottom: insets.bottom + 12, gap: 12 }]}>
          <ViewerButton
            icon="chevron-left"
            label="Previous segment"
            disabled={index === 0}
            onPress={() => goTo(index - 1)}
            testID={childTestID(id, 'previous')}
          />
          {onReply ? (
            <TouchableRipple
              onPress={() => onReply(item, '')}
              style={[styles.replyPill, { borderRadius: theme.radii.pill, borderColor: 'rgba(255,255,255,0.4)' }]}
              accessibilityRole="button"
              accessibilityLabel={`Reply to ${item.user.displayName}'s story`}
              testID={childTestID(id, 'reply')}
            >
              <Text variant="labelMedium" style={styles.onDark}>
                Reply
              </Text>
            </TouchableRipple>
          ) : (
            <View style={styles.flex} />
          )}
          <ViewerButton
            icon="chevron-right"
            label="Next segment"
            onPress={() => goTo(index + 1)}
            testID={childTestID(id, 'next')}
          />
        </View>
      </View>
    </AppSheet>
  );
};

const ViewerButton = ({
  icon,
  label,
  onPress,
  disabled = false,
  testID,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) => (
  <TouchableRipple
    onPress={onPress}
    disabled={disabled}
    borderless
    style={[styles.viewerButton, { opacity: disabled ? 0.35 : 1 }]}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    testID={testID}
  >
    <Icon source={icon} size={20} color="#FFFFFF" />
  </TouchableRipple>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressRow: { flexDirection: 'row', paddingHorizontal: 8 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  stage: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', bottom: 24, left: 16, right: 16, padding: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  viewerButton: { padding: 10, borderRadius: 24 },
  replyPill: { flex: 1, alignItems: 'center', paddingVertical: 9, borderWidth: 1 },
  onDark: { color: '#FFFFFF' },
  onDarkMuted: { color: 'rgba(255,255,255,0.7)' },
  flex: { flex: 1 },
});
