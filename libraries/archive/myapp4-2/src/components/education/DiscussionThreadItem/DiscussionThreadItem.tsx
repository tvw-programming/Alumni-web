import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { AuthorRole, DiscussionThread, ThreadStatus } from '../types/domain';

const ROLE_META: Record<AuthorRole, { label: string; icon?: string }> = {
  learner: { label: 'Learner' },
  instructor: { label: 'Instructor', icon: 'school' },
  moderator: { label: 'Moderator', icon: 'shield-account' },
};

const STATUS_META: Record<ThreadStatus, { label: string; icon: string; colorKey: 'statusInProgress' | 'statusCompleted' | 'statusLocked' | 'statusCanceled' } | null> = {
  open: null,
  resolved: { label: 'Resolved', icon: 'check-circle-outline', colorKey: 'statusCompleted' },
  locked: { label: 'Locked', icon: 'lock-outline', colorKey: 'statusLocked' },
  removed: { label: 'Removed', icon: 'eye-off-outline', colorKey: 'statusCanceled' },
};

export interface DiscussionThreadItemProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  thread: DiscussionThread;
  locale?: string;
  loading?: boolean;
  onPress?: (thread: DiscussionThread) => void;
  onReply?: (thread: DiscussionThread) => void;
  onReport?: (thread: DiscussionThread) => void;
  divider?: boolean;
  /** A reply that failed to send while offline. */
  pendingReply?: boolean;
}

/**
 * A row in the course discussion list.
 *
 * Two honesty rules: a removed post says it was removed rather than vanishing
 * (silently disappearing content makes moderation look arbitrary), and a
 * deleted author is attributed as "Deleted account" rather than being
 * reassigned or blanked. Roles are labelled in text — an avatar ring does not
 * tell a screen reader that this reply came from the instructor.
 */
export const DiscussionThreadItem = memo(function DiscussionThreadItem({
  thread,
  locale = 'en-IN',
  loading = false,
  onPress,
  onReply,
  onReport,
  divider = true,
  pendingReply = false,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: DiscussionThreadItemProps) {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `thread-${thread.id}`;
  const statusMeta = STATUS_META[thread.status];
  const role = thread.author.role ? ROLE_META[thread.author.role] : null;
  const removed = thread.status === 'removed';

  const authorName = thread.author.deleted ? 'Deleted account' : thread.author.name;

  const accessibleName = useMemo(
    () =>
      [
        thread.pinned ? 'Pinned' : undefined,
        thread.unread ? 'Unread' : undefined,
        thread.title,
        `by ${authorName}${role && thread.author.role !== 'learner' ? `, ${role.label}` : ''}`,
        `${thread.replyCount} ${thread.replyCount === 1 ? 'reply' : 'replies'}`,
        thread.hasInstructorReply ? 'has an instructor response' : undefined,
        statusMeta?.label,
        formatRelativeDate(thread.updatedAt, locale),
      ]
        .filter(Boolean)
        .join(', '),
    [authorName, locale, role, statusMeta, thread],
  );

  if (loading) {
    return (
      <View style={[{ padding: theme.spacing.md, gap: theme.spacing.xs }, containerStyle]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={1} width="70%" height={14} />
        <SkeletonLoader shape="text" lines={2} height={10} />
      </View>
    );
  }

  if (removed) {
    return (
      <View style={containerStyle} testID={id}>
        <View style={[styles.removed, { padding: theme.spacing.md, gap: 4 }]}>
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source="eye-off-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              This post was removed
            </Text>
          </View>
          {/* Honest about what happened, rather than a silent gap. */}
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {thread.removedReason ?? 'A moderator removed this post because it did not follow the community guidelines.'}
          </Text>
        </View>
        {divider ? <Divider /> : null}
      </View>
    );
  }

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        // Unread uses a surface change AND a text label, never a colour alone.
        thread.unread ? { backgroundColor: learn.colors.surfaceSelected } : undefined,
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onPress ? () => onPress(thread) : undefined}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibleName}
        testID={childTestID(id, 'row')}
      >
        <View style={{ padding: theme.spacing.md, gap: 4 }}>
          {thread.contextLabel ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {thread.contextLabel}
            </Text>
          ) : null}

          <View style={[styles.row, { gap: 4 }]}>
            {thread.pinned ? <Icon source="pin" size={13} color={learn.colors.rewardAccent} /> : null}
            {/* Thread title is the primary hierarchy. */}
            <Text variant="titleSmall" style={styles.flex} numberOfLines={2} accessibilityRole="header">
              {thread.title}
            </Text>
            {thread.unread ? (
              <Text variant="labelSmall" style={{ color: learn.colors.statusInProgress }}>
                New
              </Text>
            ) : null}
          </View>

          {thread.preview ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
              {thread.preview}
            </Text>
          ) : null}

          <View style={[styles.row, { gap: theme.spacing.xs, marginTop: 2 }]}>
            {thread.author.avatar?.uri && !thread.author.deleted ? (
              <Image
                source={{ uri: thread.author.avatar.uri }}
                style={[styles.avatar, { borderRadius: theme.radii.pill }]}
                accessibilityElementsHidden
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{thread.author.deleted ? '—' : initialsOf(thread.author.name)}</Text>
              </View>
            )}

            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {authorName}
            </Text>

            {/* Role in text, not implied by an avatar treatment. */}
            {role && thread.author.role !== 'learner' ? (
              <View style={[styles.roleChip, { backgroundColor: learn.colors.surfaceSelected, borderRadius: theme.radii.sm }]}>
                {role.icon ? <Icon source={role.icon} size={10} color={learn.colors.onSurfaceSelected} /> : null}
                <Text variant="labelSmall" style={{ color: learn.colors.onSurfaceSelected, marginLeft: 2 }}>
                  {role.label}
                </Text>
              </View>
            ) : null}

            <View style={styles.flex} />

            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatRelativeDate(thread.updatedAt, locale)}
            </Text>
          </View>

          <View style={[styles.row, { gap: theme.spacing.sm, marginTop: 2 }]}>
            {/* Counts as text, not bare glyphs. */}
            <View style={[styles.row, { gap: 3 }]}>
              <Icon source="comment-outline" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            </View>

            {thread.reactionCount ? (
              <View style={[styles.row, { gap: 3 }]}>
                <Icon source="thumb-up-outline" size={12} color={theme.colors.onSurfaceVariant} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {thread.reactionCount}
                </Text>
              </View>
            ) : null}

            {thread.hasInstructorReply ? (
              <View style={[styles.row, { gap: 3 }]}>
                <Icon source="school" size={12} color={learn.colors.statusCompleted} />
                <Text variant="labelSmall" style={{ color: learn.colors.statusCompleted }}>
                  Instructor replied
                </Text>
              </View>
            ) : null}

            {statusMeta ? (
              <View style={[styles.row, { gap: 3 }]}>
                <Icon source={statusMeta.icon} size={12} color={learn.colors[statusMeta.colorKey]} />
                <Text variant="labelSmall" style={{ color: learn.colors[statusMeta.colorKey] }}>
                  {statusMeta.label}
                </Text>
              </View>
            ) : null}
          </View>

          {pendingReply ? (
            <Text variant="labelSmall" style={{ color: learn.colors.statusLate }}>
              Your reply is saved and will send when you're back online.
            </Text>
          ) : null}

          {thread.status === 'locked' ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              This discussion is locked. You can still read it.
            </Text>
          ) : null}

          {(onReply || onReport) && thread.status === 'open' ? (
            <View style={[styles.row, { gap: theme.spacing.md, marginTop: 4 }]}>
              {onReply ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onReply(thread)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reply to ${thread.title}`}
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(id, 'reply')}
                >
                  Reply
                </Text>
              ) : null}
              {onReport ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onReport(thread)}
                  accessibilityRole="button"
                  accessibilityLabel={`Report ${thread.title}`}
                  style={{ color: theme.colors.onSurfaceVariant }}
                  testID={childTestID(id, 'report')}
                >
                  Report
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </TouchableRipple>
      {divider ? <Divider /> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  roleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 1 },
  removed: { opacity: 0.85 },
  flex: { flex: 1 },
});
