import React, { memo, useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { Size, StyleEscapeHatches } from '@ui/primitives';

import { useSocialTheme } from '../theme/socialTokens';
import type { Relationship } from '../types/domain';

export type FollowVariant = 'filled' | 'outlined' | 'compact';

interface StateConfig {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  icon?: string;
  disabled: boolean;
}

/**
 * One place that decides what each relationship looks like and says.
 *
 * "Following" never renders as a bare checkmark — the word is always present,
 * because a tick alone tells a screen reader nothing about the relationship.
 */
const STATE_CONFIG: Record<Relationship, StateConfig> = {
  none: { label: 'Follow', variant: 'primary', icon: 'plus', disabled: false },
  following: { label: 'Following', variant: 'secondary', icon: 'check', disabled: false },
  requested: { label: 'Requested', variant: 'secondary', icon: 'clock-outline', disabled: false },
  blocked: { label: 'Blocked', variant: 'ghost', icon: 'block-helper', disabled: true },
  restricted: { label: 'Restricted', variant: 'ghost', icon: 'account-alert-outline', disabled: true },
  notAllowed: { label: 'Unavailable', variant: 'ghost', disabled: true },
};

export interface FollowButtonProps extends StyleEscapeHatches {
  targetId: string;
  targetName: string;
  relationship: Relationship;
  /** Private accounts go to `requested` rather than `following`. */
  privacy?: 'public' | 'private';
  variant?: FollowVariant;
  size?: Size;
  loading?: boolean;
  /** Set when the last mutation failed, so the row can offer a retry. */
  failed?: boolean;
  /** Ask before unfollowing. Worth it on a profile, noise in a long list. */
  confirmUnfollow?: boolean;
  fullWidth?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onCancelRequest?: () => void;
  onRetry?: () => void;
  /** LinkedIn-style secondary relationship, distinct from following. */
  onConnect?: () => void;
  connectLabel?: string;
}

/**
 * The follow control.
 *
 * State transitions are announced by name ("Following Jordan", "Follow request
 * sent") rather than left to a colour swap, and focus is preserved across the
 * change so a keyboard user is not dumped back to the top of the page.
 *
 * A private account produces `requested`, and the component never silently
 * presents that as `following` — the relationship the user actually has is the
 * one shown.
 */
export const FollowButton = memo(function FollowButton({
  targetId,
  targetName,
  relationship,
  privacy = 'public',
  variant = 'filled',
  size = 'md',
  loading = false,
  failed = false,
  confirmUnfollow = false,
  fullWidth = false,
  onFollow,
  onUnfollow,
  onCancelRequest,
  onRetry,
  onConnect,
  connectLabel = 'Connect',
  style,
  containerStyle,
  testID,
}: FollowButtonProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const confirm = useConfirm();

  const id = testID ?? `follow-${targetId}`;
  const config = STATE_CONFIG[relationship];
  const previous = useRef(relationship);

  /** Announce the new relationship, not just the new colour. */
  useEffect(() => {
    if (previous.current === relationship) return;
    const message =
      relationship === 'following'
        ? `Following ${targetName}`
        : relationship === 'requested'
          ? `Follow request sent to ${targetName}`
          : relationship === 'none' && previous.current === 'following'
            ? `Unfollowed ${targetName}`
            : relationship === 'none' && previous.current === 'requested'
              ? `Follow request to ${targetName} cancelled`
              : undefined;
    if (message) AccessibilityInfo.announceForAccessibility(message);
    previous.current = relationship;
  }, [relationship, targetName]);

  const handlePress = useCallback(async () => {
    if (config.disabled) return;

    if (relationship === 'requested') {
      onCancelRequest?.();
      return;
    }

    if (relationship === 'following') {
      if (confirmUnfollow) {
        const ok = await confirm({
          title: `Unfollow ${targetName}?`,
          message:
            privacy === 'private'
              ? "You'll need to request access again to see their posts."
              : 'Their posts will no longer appear in your feed.',
          confirmLabel: 'Unfollow',
          cancelLabel: 'Cancel',
        });
        if (!ok) return;
      }
      onUnfollow?.();
      return;
    }

    onFollow?.();
  }, [config.disabled, confirm, confirmUnfollow, onCancelRequest, onFollow, onUnfollow, privacy, relationship, targetName]);

  /** The spoken label states the relationship and what the tap will do. */
  const accessibilityLabel = (() => {
    switch (relationship) {
      case 'following':
        return `Following ${targetName}. Double tap to unfollow.`;
      case 'requested':
        return `Follow request sent to ${targetName}. Double tap to cancel the request.`;
      case 'blocked':
        return `You have blocked ${targetName}.`;
      case 'restricted':
        return `${targetName} is restricted.`;
      case 'notAllowed':
        return `You can't follow ${targetName}.`;
      default:
        return privacy === 'private'
          ? `Request to follow ${targetName}. This account is private.`
          : `Follow ${targetName}.`;
    }
  })();

  return (
    <View style={containerStyle} testID={id}>
      <View style={[styles.row, { gap: theme.spacing.xs }]}>
        <AppButton
          variant={variant === 'outlined' && config.variant === 'primary' ? 'secondary' : config.variant}
          size={size}
          icon={variant === 'compact' ? undefined : config.icon}
          loading={loading}
          disabled={config.disabled}
          fullWidth={fullWidth}
          // Follow/unfollow is a mutation; double taps must not double-fire.
          debounceMs={700}
          onPress={() => void handlePress()}
          accessibilityLabel={accessibilityLabel}
          containerStyle={fullWidth ? styles.flex : undefined}
          style={style}
          testID={childTestID(id, 'button')}
        >
          {/* Always the word, never only a tick. */}
          {relationship === 'none' && privacy === 'private' ? 'Follow' : config.label}
        </AppButton>

        {/* Connect is a separate relationship, not a rename of follow. */}
        {onConnect && relationship !== 'blocked' ? (
          <AppButton
            variant="secondary"
            size={size}
            onPress={onConnect}
            debounceMs={700}
            accessibilityLabel={`${connectLabel} with ${targetName}`}
            testID={childTestID(id, 'connect')}
          >
            {connectLabel}
          </AppButton>
        ) : null}
      </View>

      {relationship === 'requested' ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          Follow request sent
        </Text>
      ) : null}

      {failed ? (
        <Text
          variant="labelSmall"
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="That didn't work. Tap to try again."
          style={{ color: social.colors.statusError, marginTop: 2 }}
          testID={childTestID(id, 'retry')}
        >
          That didn't work · Try again
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
