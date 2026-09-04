import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { AppSheet } from '@ui/organisms/AppSheet';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSocialTheme } from '../theme/socialTokens';
import type { ReactionDefinition, ReactionState } from '../types/domain';

/** Default set. Products override it; the shapes stay distinguishable in mono. */
export const DEFAULT_REACTIONS: ReactionDefinition[] = [
  { id: 'like', label: 'Like', icon: 'heart', glyph: '❤️' },
  { id: 'celebrate', label: 'Celebrate', icon: 'party-popper', glyph: '🎉' },
  { id: 'insightful', label: 'Insightful', icon: 'lightbulb-on', glyph: '💡' },
  { id: 'support', label: 'Support', icon: 'hand-heart', glyph: '🤝' },
  { id: 'laugh', label: 'Funny', icon: 'emoticon-happy', glyph: '😄' },
];

const formatCount = (value: number): string => {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
};

export interface ReactionBarProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  state: ReactionState;
  reactions?: ReactionDefinition[];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  /** Disables everything and explains why. */
  disabledReason?: string;
  /** True while a reaction mutation is in flight. */
  syncing?: boolean;
  /** Set when the last mutation failed, so the row can offer a retry. */
  failed?: boolean;
  onReactionChange?: (reaction?: string) => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: (next: boolean) => void;
  onRetry?: () => void;
  onViewReactions?: () => void;
  compact?: boolean;
}

/**
 * The engagement row.
 *
 * Selection is announced by *name* — "Liked", "Removed like", "Reacted with
 * Celebrate" — never by colour or a fill animation alone. Counts are readable
 * independently of the buttons, and when a product hides counts the row says so
 * rather than rendering an unexplained zero.
 *
 * Reaction mutations belong to the caller; this component reports intent and
 * renders whatever state comes back, including the failed one.
 */
export const ReactionBar = memo(function ReactionBar({
  state,
  reactions = DEFAULT_REACTIONS,
  orientation = 'horizontal',
  showLabels = false,
  disabledReason,
  syncing = false,
  failed = false,
  onReactionChange,
  onComment,
  onShare,
  onSave,
  onRetry,
  onViewReactions,
  compact = false,
  animated = true,
  style,
  containerStyle,
  testID,
}: ReactionBarProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const motion = useMotion({ animated });
  const [pickerOpen, setPickerOpen] = useState(false);

  const id = testID ?? 'reactions';
  const disabled = !!disabledReason;
  const vertical = orientation === 'vertical';

  const primary = reactions[0] as ReactionDefinition;
  const selected = state.userReaction
    ? reactions.find((reaction) => reaction.id === state.userReaction)
    : undefined;

  const totalReactions = useMemo(
    () => Object.values(state.counts).reduce((sum, value) => sum + value, 0),
    [state.counts],
  );

  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const handlePrimary = useCallback(() => {
    if (disabled) return;
    if (motion.enabled && !selected) {
      pop.value = withSequence(withSpring(1.25, theme.motion.spring.bouncy), withSpring(1, theme.motion.spring.snappy));
    }
    // Tapping the selected reaction removes it; otherwise apply the primary one.
    onReactionChange?.(selected ? undefined : primary.id);
  }, [disabled, motion.enabled, onReactionChange, pop, primary.id, selected, theme.motion.spring]);

  const chooseReaction = useCallback(
    (reaction: ReactionDefinition) => {
      setPickerOpen(false);
      onReactionChange?.(reaction.id === state.userReaction ? undefined : reaction.id);
    },
    [onReactionChange, state.userReaction],
  );

  const countText = state.countsHidden ? null : totalReactions > 0 ? formatCount(totalReactions) : null;

  return (
    <View style={[vertical ? styles.column : styles.row, containerStyle, style]} testID={id}>
      {/* Primary reaction */}
      <Animated.View style={popStyle}>
        <ActionButton
          icon={selected?.icon ?? primary.icon}
          label={selected?.label ?? primary.label}
          // The spoken label names the reaction and its count.
          accessibilityLabel={
            disabled
              ? `${primary.label} unavailable. ${disabledReason}`
              : selected
                ? `Remove ${selected.label}. ${state.countsHidden ? 'Counts hidden' : `${totalReactions} reactions`}`
                : `${primary.label} this post. ${state.countsHidden ? 'Counts hidden' : `${totalReactions} reactions`}`
          }
          count={countText}
          selected={!!selected}
          disabled={disabled}
          busy={syncing}
          showLabel={showLabels}
          vertical={vertical}
          compact={compact}
          onPress={handlePrimary}
          onLongPress={disabled ? undefined : () => setPickerOpen(true)}
          selectedColor={social.colors.reactionSelected}
          testID={childTestID(id, 'primary')}
        />
      </Animated.View>

      {onComment ? (
        <ActionButton
          icon="comment-outline"
          label="Comment"
          accessibilityLabel={
            state.commentCount ? `View ${state.commentCount} comments` : 'Add a comment'
          }
          count={state.commentCount ? formatCount(state.commentCount) : null}
          showLabel={showLabels}
          vertical={vertical}
          compact={compact}
          disabled={disabled}
          onPress={onComment}
          testID={childTestID(id, 'comment')}
        />
      ) : null}

      {onShare ? (
        <ActionButton
          icon="share-outline"
          label="Share"
          accessibilityLabel="Share post"
          count={state.shareCount ? formatCount(state.shareCount) : null}
          showLabel={showLabels}
          vertical={vertical}
          compact={compact}
          disabled={disabled}
          onPress={onShare}
          testID={childTestID(id, 'share')}
        />
      ) : null}

      {onSave ? (
        <ActionButton
          icon={state.saved ? 'bookmark' : 'bookmark-outline'}
          label={state.saved ? 'Saved' : 'Save'}
          accessibilityLabel={state.saved ? 'Remove from saved' : 'Save post'}
          selected={state.saved}
          showLabel={showLabels}
          vertical={vertical}
          compact={compact}
          disabled={disabled}
          onPress={() => onSave(!state.saved)}
          selectedColor={social.colors.statusUnread}
          testID={childTestID(id, 'save')}
        />
      ) : null}

      {!vertical ? <View style={styles.flex} /> : null}

      {/* Counts stay legible on their own, away from the buttons. */}
      {state.countsHidden ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {state.hiddenReason ?? 'Reaction counts are hidden'}
        </Text>
      ) : totalReactions > 0 && onViewReactions && !vertical ? (
        <TouchableRipple
          onPress={onViewReactions}
          accessibilityRole="button"
          accessibilityLabel={`View all ${totalReactions} reactions`}
          testID={childTestID(id, 'view-all')}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatCount(totalReactions)} reactions
          </Text>
        </TouchableRipple>
      ) : null}

      {/* A failed mutation is visible and recoverable, not silently dropped. */}
      {failed ? (
        <View style={[styles.row, { gap: 4 }]}>
          <Icon source="alert-circle-outline" size={13} color={social.colors.statusError} />
          <Text
            variant="labelSmall"
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Your reaction did not save. Tap to retry."
            style={{ color: social.colors.statusError }}
            testID={childTestID(id, 'retry')}
          >
            Didn't save · Retry
          </Text>
        </View>
      ) : null}

      {disabled ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {disabledReason}
        </Text>
      ) : null}

      {/* Expanded picker — reachable by long press and by an explicit control. */}
      <AppSheet
        visible={pickerOpen}
        onDismiss={() => setPickerOpen(false)}
        variant="bottom"
        title="React"
        animated={animated}
        testID={childTestID(id, 'picker')}
      >
        <View
          style={[styles.picker, { gap: theme.spacing.sm }]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Choose a reaction"
        >
          {reactions.map((reaction) => {
            const isSelected = reaction.id === state.userReaction;
            return (
              <TouchableRipple
                key={reaction.id}
                onPress={() => chooseReaction(reaction)}
                borderless
                style={{ borderRadius: theme.radii.md }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${reaction.label}${isSelected ? ', selected' : ''}`}
                testID={childTestID(id, `pick-${reaction.id}`)}
              >
                <View
                  style={[
                    styles.pickerItem,
                    {
                      borderRadius: theme.radii.md,
                      padding: theme.spacing.sm,
                      backgroundColor: isSelected ? social.colors.reactionSelectedSurface : 'transparent',
                    },
                  ]}
                >
                  <Icon
                    source={reaction.icon}
                    size={26}
                    color={isSelected ? social.colors.reactionSelected : social.colors.reactionDefault}
                  />
                  {/* Every reaction carries its name. */}
                  <Text variant="labelSmall" style={{ marginTop: 2 }}>
                    {reaction.label}
                  </Text>
                  {state.counts[reaction.id] ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatCount(state.counts[reaction.id] as number)}
                    </Text>
                  ) : null}
                </View>
              </TouchableRipple>
            );
          })}
        </View>
      </AppSheet>
    </View>
  );
});

interface ActionButtonProps {
  icon: string;
  label: string;
  accessibilityLabel: string;
  count?: string | null;
  selected?: boolean;
  disabled?: boolean;
  busy?: boolean;
  showLabel?: boolean;
  vertical?: boolean;
  compact?: boolean;
  selectedColor?: string;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

const ActionButton = memo(function ActionButton({
  icon,
  label,
  accessibilityLabel,
  count,
  selected = false,
  disabled = false,
  busy = false,
  showLabel = false,
  vertical = false,
  compact = false,
  selectedColor,
  onPress,
  onLongPress,
  testID,
}: ActionButtonProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const color = selected ? (selectedColor ?? social.colors.reactionSelected) : social.colors.reactionDefault;

  return (
    <TouchableRipple
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      borderless
      style={[styles.action, { borderRadius: theme.radii.pill, opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled, busy }}
      accessibilityHint={onLongPress ? 'Long press for more reactions' : undefined}
      testID={testID}
    >
      <View
        style={[
          vertical ? styles.column : styles.row,
          { gap: 4, paddingHorizontal: compact ? 6 : 10, paddingVertical: 6 },
        ]}
      >
        {busy ? <ActivityIndicator size={14} /> : <Icon source={icon} size={compact ? 17 : 19} color={color} />}
        {showLabel || vertical ? (
          <Text variant="labelSmall" style={{ color }}>
            {label}
          </Text>
        ) : null}
        {count ? (
          <Text variant="labelSmall" style={[styles.tabular, { color }]}>
            {count}
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  column: { flexDirection: 'column', alignItems: 'center' },
  action: { overflow: 'hidden' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  pickerItem: { alignItems: 'center', minWidth: 64 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
