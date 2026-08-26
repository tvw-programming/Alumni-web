import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useSocialTheme } from '../theme/socialTokens';
import type { MessageStatus, TypingState } from '../types/domain';

const STATUS_META: Record<
  MessageStatus,
  { label: string; icon: string; colorKey: 'deliverySending' | 'deliverySent' | 'deliveryDelivered' | 'deliveryRead' | 'deliveryFailed' }
> = {
  sending: { label: 'Sending', icon: 'clock-outline', colorKey: 'deliverySending' },
  sent: { label: 'Sent', icon: 'check', colorKey: 'deliverySent' },
  delivered: { label: 'Delivered', icon: 'check-all', colorKey: 'deliveryDelivered' },
  read: { label: 'Read', icon: 'check-all', colorKey: 'deliveryRead' },
  played: { label: 'Played', icon: 'microphone', colorKey: 'deliveryRead' },
  failed: { label: 'Not sent', icon: 'alert-circle-outline', colorKey: 'deliveryFailed' },
};

export interface MessageStatusIconProps {
  status: MessageStatus;
  /**
   * When the recipient has read receipts off we must not imply read status —
   * delivery is the furthest we can honestly claim.
   */
  readReceiptsDisabled?: boolean;
  showLabel?: boolean;
  size?: number;
  testID?: string;
}

/**
 * Delivery status.
 *
 * Every state carries a text label as well as a glyph, because two ticks versus
 * one blue tick is meaningless to a screen reader and nearly meaningless in
 * monochrome. When the recipient has receipts disabled the component refuses to
 * render "Read" at all, rather than quietly showing a stale delivered state.
 */
export const MessageStatusIcon = memo(function MessageStatusIcon({
  status,
  readReceiptsDisabled = false,
  showLabel = false,
  size = 13,
  testID,
}: MessageStatusIconProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();

  // Never imply read when the recipient has turned receipts off.
  const effective: MessageStatus =
    readReceiptsDisabled && (status === 'read' || status === 'played') ? 'delivered' : status;

  const meta = STATUS_META[effective];
  const color = social.colors[meta.colorKey];

  return (
    <View
      style={[styles.row, { gap: 3 }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        readReceiptsDisabled && status === 'read'
          ? 'Delivered. Read receipts are off for this chat.'
          : meta.label
      }
      testID={testID}
    >
      {effective === 'sending' ? (
        <ActivityIndicator size={size - 1} color={color} />
      ) : (
        <Icon source={meta.icon} size={size} color={color} />
      )}
      {showLabel ? (
        <Text variant="labelSmall" style={{ color }}>
          {meta.label}
        </Text>
      ) : null}
    </View>
  );
});

export interface TypingIndicatorProps extends Pick<AnimatableProps, 'animated'> {
  typing: TypingState;
  /** Indicators older than this are treated as stale and hidden. */
  staleAfterMs?: number;
  /** Renders the dots inside a bubble, for use in a message list. */
  inBubble?: boolean;
  testID?: string;
}

/**
 * "Alex is typing…"
 *
 * Three rules the spec asks for and this enforces: the text form is the real
 * content (the dots are decorative and hidden from assistive tech), the live
 * region announces the sentence once rather than every animation frame, and a
 * stale indicator disappears instead of animating forever after the socket drops.
 */
export const TypingIndicator = memo(function TypingIndicator({
  typing,
  staleAfterMs = 8000,
  inBubble = false,
  animated = true,
  testID,
}: TypingIndicatorProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const motion = useMotion({ animated });
  const [now, setNow] = useState(() => Date.now());

  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  const stale = now - new Date(typing.updatedAt).getTime() > staleAfterMs;
  const active = typing.users.length > 0 && !stale;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!active || !motion.enabled) {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
      return;
    }
    const bounce = (value: typeof dot1, delay: number) => {
      value.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    };
    bounce(dot1, 0);
    bounce(dot2, 140);
    bounce(dot3, 280);
    return () => {
      cancelAnimation(dot1);
      cancelAnimation(dot2);
      cancelAnimation(dot3);
    };
  }, [active, dot1, dot2, dot3, motion.enabled]);

  /** One person / two people / several — never a wall of names. */
  const sentence = useMemo(() => {
    const [first, second] = typing.users;
    if (typing.users.length === 1) return `${first} is typing…`;
    if (typing.users.length === 2) return `${first} and ${second} are typing…`;
    return 'Several people are typing…';
  }, [typing.users]);

  /**
   * Declared unconditionally and before any early return — hook order must not
   * depend on whether anyone is currently typing.
   */
  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot1.value * 3 }],
    opacity: 0.5 + dot1.value * 0.5,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot2.value * 3 }],
    opacity: 0.5 + dot2.value * 0.5,
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot3.value * 3 }],
    opacity: 0.5 + dot3.value * 0.5,
  }));

  if (!active) return null;

  return (
    <View
      style={[
        styles.typingRow,
        inBubble
          ? {
              backgroundColor: social.colors.surfaceMessageReceived,
              borderRadius: theme.radii.lg,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 8,
              alignSelf: 'flex-start',
            }
          : { paddingHorizontal: theme.spacing.md, paddingVertical: 4 },
      ]}
      accessible
      accessibilityRole="text"
      // The sentence is announced; the dots are not.
      accessibilityLiveRegion="polite"
      accessibilityLabel={sentence}
      testID={testID}
    >
      <View style={[styles.row, { gap: 3 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {motion.enabled ? (
          <>
            <Animated.View style={[styles.dot, dot1Style, { backgroundColor: theme.colors.onSurfaceVariant }]} />
            <Animated.View style={[styles.dot, dot2Style, { backgroundColor: theme.colors.onSurfaceVariant }]} />
            <Animated.View style={[styles.dot, dot3Style, { backgroundColor: theme.colors.onSurfaceVariant }]} />
          </>
        ) : (
          // Reduced motion gets a static ellipsis instead of bouncing dots.
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            …
          </Text>
        )}
      </View>

      {!inBubble ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
          {sentence}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  typingRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
