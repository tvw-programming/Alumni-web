import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { RichBody } from '../primitives/RichBody';
import { SocialAvatar } from '../primitives/SocialAvatar';
import { useSocialTheme } from '../theme/socialTokens';
import type { Comment } from '../types/domain';

export interface CommentItemProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  comment: Comment;
  locale?: string;
  onLike?: (comment: Comment) => void;
  onReply?: (comment: Comment) => void;
  onPressAuthor?: (comment: Comment) => void;
  onRetry?: (comment: Comment) => void;
  onViewReplies?: (comment: Comment) => void;
  onReport?: (comment: Comment) => void;
  /** Replies are indented, but the relationship is also stated in text. */
  maxIndent?: number;
}

/**
 * One comment.
 *
 * Nesting is communicated in *words* as well as indentation — "Replying to
 * Maya" — because indentation is invisible to a screen reader and collapses at
 * large text sizes. Failed comments stay visible with a retry rather than
 * disappearing, and moderation outcomes distinguish author deletion from
 * moderator removal.
 */
export const CommentItem = memo(function CommentItem({
  comment,
  locale = 'en-IN',
  onLike,
  onReply,
  onPressAuthor,
  onRetry,
  onViewReplies,
  onReport,
  maxIndent = 2,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: CommentItemProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `comment-${comment.id}`;
  const depth = Math.min(comment.depth ?? 0, maxIndent);
  const failed = comment.status === 'failed';
  const sending = comment.status === 'sending';
  const moderated = comment.moderation && comment.moderation !== 'visible';

  const timeLabel = useMemo(() => formatRelativeDate(comment.createdAt, locale), [comment.createdAt, locale]);

  if (moderated) {
    const copy =
      comment.moderation === 'removedByAuthor'
        ? 'This comment was deleted by its author.'
        : comment.moderation === 'removedByModerator'
          ? 'This comment was removed by a moderator.'
          : 'This comment is awaiting review.';

    return (
      <View
        style={[{ paddingLeft: depth * 28 + theme.spacing.md, paddingRight: theme.spacing.md, paddingVertical: theme.spacing.sm }, containerStyle]}
        testID={childTestID(id, 'moderated')}
      >
        <View style={[styles.row, { gap: 5 }]}>
          <Icon source="eye-off-outline" size={13} color={social.colors.statusModerated} />
          <Text variant="labelSmall" style={{ color: social.colors.statusModerated, flex: 1 }}>
            {copy}
          </Text>
        </View>
        {comment.moderationNote ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {comment.moderationNote}
          </Text>
        ) : null}
      </View>
    );
  }

  /** The full sentence a screen reader hears for this row. */
  const accessibleName = [
    comment.pinned ? 'Pinned comment' : undefined,
    comment.parentAuthorName ? `Reply to ${comment.parentAuthorName}` : undefined,
    `${comment.author.displayName}${comment.byCreator ? ', author' : ''}`,
    timeLabel,
    comment.editedAt ? 'edited' : undefined,
    failed ? 'not posted' : sending ? 'posting' : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          paddingLeft: depth * 28 + theme.spacing.md,
          paddingRight: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          opacity: sending ? 0.7 : 1,
          backgroundColor: comment.pinned ? social.colors.surfaceFeedAlt : 'transparent',
        },
        containerStyle,
        style,
      ]}
      accessible={false}
      testID={id}
    >
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        <TouchableRipple
          onPress={onPressAuthor ? () => onPressAuthor(comment) : undefined}
          disabled={!onPressAuthor}
          borderless
          style={{ borderRadius: theme.radii.pill }}
          accessibilityRole="link"
          accessibilityLabel={`${comment.author.displayName}. Open profile.`}
          testID={childTestID(id, 'author')}
        >
          <SocialAvatar user={comment.author} size={depth > 0 ? 26 : social.layout.avatarSm} />
        </TouchableRipple>

        <View style={styles.flex}>
          {/* Nesting stated in text, not left to indentation alone. */}
          {comment.parentAuthorName ? (
            <View style={[styles.row, { gap: 3 }]}>
              <Icon source="reply" size={11} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Replying to {comment.parentAuthorName}
              </Text>
            </View>
          ) : null}

          <View style={[styles.row, { gap: 4 }]} accessible accessibilityLabel={accessibleName}>
            <Text variant="labelMedium" numberOfLines={1} style={styles.shrink}>
              {comment.author.deleted ? 'Deleted account' : comment.author.displayName}
            </Text>
            {comment.author.verified ? (
              <Icon source="check-decagram" size={12} color={social.colors.verified} />
            ) : null}
            {comment.byCreator ? (
              <View style={[styles.chip, { backgroundColor: social.colors.surfaceSelected, borderRadius: theme.radii.sm }]}>
                <Text variant="labelSmall" style={{ color: social.colors.onSurfaceSelected }}>
                  Author
                </Text>
              </View>
            ) : null}
            {comment.pinned ? (
              <View style={[styles.row, { gap: 2 }]}>
                <Icon source="pin" size={11} color={theme.colors.onSurfaceVariant} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Pinned
                </Text>
              </View>
            ) : null}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              · {timeLabel}
            </Text>
            {comment.editedAt ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                · Edited
              </Text>
            ) : null}
          </View>

          <RichBody
            body={comment.body}
            variant="bodySmall"
            truncateAt={220}
            testID={childTestID(id, 'body')}
          />

          <View style={[styles.row, { gap: theme.spacing.md, marginTop: 4 }]}>
            {onLike ? (
              <TouchableRipple
                onPress={() => onLike(comment)}
                borderless
                style={{ borderRadius: theme.radii.pill }}
                accessibilityRole="button"
                accessibilityState={{ selected: comment.userLiked }}
                accessibilityLabel={
                  comment.userLiked
                    ? `Remove like. ${comment.likeCount ?? 0} likes`
                    : `Like this comment. ${comment.likeCount ?? 0} likes`
                }
                testID={childTestID(id, 'like')}
              >
                <View style={[styles.row, { gap: 3 }]}>
                  <Icon
                    source={comment.userLiked ? 'heart' : 'heart-outline'}
                    size={13}
                    color={comment.userLiked ? social.colors.reactionSelected : theme.colors.onSurfaceVariant}
                  />
                  {comment.likeCount ? (
                    <Text
                      variant="labelSmall"
                      style={{ color: comment.userLiked ? social.colors.reactionSelected : theme.colors.onSurfaceVariant }}
                    >
                      {comment.likeCount}
                    </Text>
                  ) : null}
                </View>
              </TouchableRipple>
            ) : null}

            {onReply ? (
              <Text
                variant="labelSmall"
                onPress={() => onReply(comment)}
                accessibilityRole="button"
                accessibilityLabel={`Reply to ${comment.author.displayName}`}
                style={{ color: theme.colors.onSurfaceVariant }}
                testID={childTestID(id, 'reply')}
              >
                Reply
              </Text>
            ) : null}

            {onReport ? (
              <Text
                variant="labelSmall"
                onPress={() => onReport(comment)}
                accessibilityRole="button"
                accessibilityLabel="Report this comment"
                style={{ color: theme.colors.onSurfaceVariant }}
                testID={childTestID(id, 'report')}
              >
                Report
              </Text>
            ) : null}

            {sending ? (
              <View style={[styles.row, { gap: 4 }]}>
                <ActivityIndicator size={10} />
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Posting…
                </Text>
              </View>
            ) : null}
          </View>

          {/* A failed comment is visible and recoverable. */}
          {failed ? (
            <View style={[styles.row, { gap: 4, marginTop: 4 }]}>
              <Icon source="alert-circle-outline" size={13} color={social.colors.statusError} />
              <Text variant="labelSmall" style={{ color: social.colors.statusError, flex: 1 }}>
                Your comment couldn't be posted.
              </Text>
              {onRetry ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onRetry(comment)}
                  accessibilityRole="button"
                  accessibilityLabel="Retry posting this comment"
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(id, 'retry')}
                >
                  Try again
                </Text>
              ) : null}
            </View>
          ) : null}

          {comment.replyCount && onViewReplies ? (
            <Text
              variant="labelSmall"
              onPress={() => onViewReplies(comment)}
              accessibilityRole="button"
              accessibilityLabel={`View ${comment.replyCount} replies to ${comment.author.displayName}`}
              style={{ color: theme.colors.primary, marginTop: 4 }}
              testID={childTestID(id, 'view-replies')}
            >
              View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 5, paddingVertical: 1 },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
});
