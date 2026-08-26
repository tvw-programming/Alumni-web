import React, { memo, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Divider, Icon, IconButton, Menu, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { AuthorLine, SocialAvatar } from '../primitives/SocialAvatar';
import { RichBody } from '../primitives/RichBody';
import { ReactionBar } from '../ReactionBar/ReactionBar';
import { useSocialTheme } from '../theme/socialTokens';
import type { Post, ReactionState } from '../types/domain';
import { PostMedia } from './PostMedia';

export interface PostOverflowAction {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}

export interface PostCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  post: Post;
  reactions?: ReactionState;
  density?: 'comfortable' | 'compact';
  mediaMode?: 'auto' | 'static' | 'interactive';
  showAuthor?: boolean;
  showActions?: boolean;
  isDetailView?: boolean;
  loading?: boolean;
  locale?: string;
  onPressAuthor?: (post: Post) => void;
  onPressPost?: (post: Post) => void;
  onReact?: (postId: string, reaction?: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onSave?: (postId: string, next: boolean) => void;
  onOpenMedia?: (post: Post, index: number) => void;
  onOpenLink?: (url: string) => void;
  onVote?: (postId: string, optionId: string) => void;
  overflowActions?: PostOverflowAction[];
}

/**
 * A feed post.
 *
 * Deliberately *not* one giant tappable card: the author, the body links, the
 * media, each reaction and the overflow menu are separate focus targets. A
 * single card-wide press target makes a screen reader announce a wall of text
 * with one useless "button" role, and makes keyboard users unable to reach the
 * link inside.
 *
 * Moderated posts render a tombstone that states who removed it — content that
 * silently disappears makes moderation look arbitrary.
 */
const PostCardBase = memo(function PostCard({
  post,
  reactions,
  density = 'comfortable',
  mediaMode = 'auto',
  showAuthor = true,
  showActions = true,
  isDetailView = false,
  loading = false,
  locale = 'en-IN',
  onPressAuthor,
  onPressPost,
  onReact,
  onComment,
  onShare,
  onSave,
  onOpenMedia,
  onOpenLink,
  onVote,
  overflowActions = [],
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: PostCardProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const motion = useMotion({ animated });
  const [menuOpen, setMenuOpen] = useState(false);

  const id = testID ?? `post-${post.id}`;
  const compact = density === 'compact';
  const moderated = post.moderation && post.moderation !== 'visible';

  const timeLabel = useMemo(() => formatRelativeDate(post.createdAt, locale), [locale, post.createdAt]);

  const contextLabel = useMemo(() => {
    const parts = [
      post.sponsored ? 'Sponsored' : undefined,
      post.pinned ? 'Pinned' : undefined,
      post.editedAt ? 'Edited' : undefined,
      post.audienceLabel,
    ];
    return parts.filter(Boolean).join(' · ') || undefined;
  }, [post]);

  if (loading) {
    return (
      <View
        style={[{ backgroundColor: social.colors.surfaceFeed, padding: theme.spacing.md, gap: theme.spacing.sm }, containerStyle]}
        testID={childTestID(id, 'skeleton')}
      >
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <SkeletonLoader shape="circle" height={social.layout.avatarMd} />
          <View style={styles.flex}>
            <SkeletonLoader shape="text" lines={2} />
          </View>
        </View>
        <SkeletonLoader shape="rect" height={180} />
      </View>
    );
  }

  /** Removed content is stated, not hidden. */
  if (moderated) {
    const copy =
      post.moderation === 'removedByAuthor'
        ? 'This post was deleted by its author.'
        : post.moderation === 'removedByModerator'
          ? 'This post was removed by a moderator.'
          : post.moderation === 'restricted'
            ? 'This post is not available to you.'
            : 'This post is unavailable.';

    return (
      <View
        style={[
          { backgroundColor: social.colors.surfaceFeed, padding: theme.spacing.md, gap: 4 },
          containerStyle,
        ]}
        testID={childTestID(id, 'moderated')}
      >
        <View style={[styles.row, { gap: 6 }]}>
          <Icon source="eye-off-outline" size={16} color={social.colors.statusModerated} />
          <Text variant="labelMedium" style={{ color: social.colors.statusModerated }}>
            {copy}
          </Text>
        </View>
        {post.moderationNote ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {post.moderationNote}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[{ backgroundColor: social.colors.surfaceFeed }, containerStyle, style]}
      testID={id}
    >
      <View style={{ padding: compact ? theme.spacing.sm : theme.spacing.md, gap: theme.spacing.sm }}>
        {showAuthor ? (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            {/* The author region is its own target, separate from the body. */}
            <TouchableRipple
              onPress={onPressAuthor ? () => onPressAuthor(post) : undefined}
              disabled={!onPressAuthor}
              borderless
              style={{ borderRadius: theme.radii.pill }}
              accessibilityRole="link"
              accessibilityLabel={`${post.author.displayName}${post.author.verified ? ', verified' : ''}. Open profile.`}
              testID={childTestID(id, 'author')}
            >
              <SocialAvatar user={post.author} size={compact ? social.layout.avatarSm : social.layout.avatarMd} />
            </TouchableRipple>

            <AuthorLine
              user={post.author}
              timeLabel={timeLabel}
              contextLabel={contextLabel}
              compact={compact}
              testID={childTestID(id, 'author-line')}
            />

            {overflowActions.length > 0 ? (
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchor={
                  <IconButton
                    icon="dots-horizontal"
                    size={18}
                    onPress={() => setMenuOpen(true)}
                    // A separate, separately-labelled control.
                    accessibilityLabel={`More options for ${post.author.displayName}'s post`}
                    style={{ margin: 0 }}
                    testID={childTestID(id, 'overflow')}
                  />
                }
              >
                {overflowActions.map((action) => (
                  <Menu.Item
                    key={action.key}
                    title={action.label}
                    leadingIcon={action.icon}
                    titleStyle={action.destructive ? { color: social.colors.statusError } : undefined}
                    onPress={() => {
                      setMenuOpen(false);
                      action.onPress();
                    }}
                    testID={childTestID(id, `action-${action.key}`)}
                  />
                ))}
              </Menu>
            ) : null}
          </View>
        ) : null}

        {post.locationLabel ? (
          <View style={[styles.row, { gap: 3 }]}>
            <Icon source="map-marker-outline" size={12} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {post.locationLabel}
            </Text>
          </View>
        ) : null}

        {post.body ? (
          <RichBody
            body={post.body}
            truncateAt={isDetailView ? 100000 : compact ? 140 : 280}
            translatedFrom={post.translatedFrom}
            onLinkPress={onOpenLink}
            onMentionPress={(handle) => onOpenLink?.(handle)}
            testID={childTestID(id, 'body')}
          />
        ) : null}

        {/* Quoted post renders as a nested, bordered card. */}
        {post.quotedPost ? (
          <View
            style={[
              styles.quote,
              { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm },
            ]}
            testID={childTestID(id, 'quote')}
          >
            <View style={[styles.row, { gap: 6 }]}>
              <SocialAvatar user={post.quotedPost.author} size={20} />
              <Text variant="labelSmall" numberOfLines={1} style={styles.flex}>
                {post.quotedPost.author.displayName}
                {post.quotedPost.author.handle ? ` ${post.quotedPost.author.handle}` : ''}
              </Text>
            </View>
            {post.quotedPost.body ? (
              <Text variant="bodySmall" numberOfLines={4} style={{ marginTop: 4 }}>
                {post.quotedPost.body}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {post.media?.length ? (
        <View style={{ paddingHorizontal: compact ? theme.spacing.sm : theme.spacing.md }}>
          <PostMedia
            media={post.media}
            contentWarning={post.contentWarning}
            mediaMode={mediaMode}
            onPress={(mediaIndex) => onOpenMedia?.(post, mediaIndex)}
            testID={childTestID(id, 'media')}
          />
        </View>
      ) : null}

      {post.link ? (
        <TouchableRipple
          onPress={onOpenLink ? () => onOpenLink(post.link!.url) : undefined}
          disabled={!onOpenLink}
          accessibilityRole="link"
          accessibilityLabel={`Link: ${post.link.title}, ${post.link.domain}`}
          style={{ marginHorizontal: theme.spacing.md }}
          testID={childTestID(id, 'link')}
        >
          <View style={[styles.link, { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md }]}>
            {post.link.image?.uri ? (
              <Image source={{ uri: post.link.image.uri }} style={styles.linkImage} accessibilityElementsHidden />
            ) : null}
            <View style={{ padding: theme.spacing.sm }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {post.link.domain}
              </Text>
              <Text variant="labelLarge" numberOfLines={2}>
                {post.link.title}
              </Text>
              {post.link.description ? (
                <Text variant="labelSmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant }}>
                  {post.link.description}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableRipple>
      ) : null}

      {post.poll ? (
        <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
          {post.poll.options.map((option) => {
            const share = post.poll!.totalVotes > 0 ? option.votes / post.poll!.totalVotes : 0;
            const voted = post.poll!.votedOptionId === option.id;
            const showResults = !!post.poll!.votedOptionId || post.poll!.closed;

            return (
              <TouchableRipple
                key={option.id}
                onPress={onVote && !showResults ? () => onVote(post.id, option.id) : undefined}
                disabled={showResults || !onVote}
                accessibilityRole="radio"
                accessibilityState={{ selected: voted, disabled: showResults }}
                accessibilityLabel={`${option.label}${
                  showResults ? `, ${Math.round(share * 100)} percent, ${option.votes} votes` : ''
                }${voted ? ', your vote' : ''}`}
                style={{ borderRadius: theme.radii.md }}
                testID={childTestID(id, `poll-${option.id}`)}
              >
                <View
                  style={[
                    styles.pollRow,
                    { borderColor: voted ? social.colors.statusUnread : theme.colors.outlineVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm },
                  ]}
                >
                  <View style={[styles.row, { gap: 6 }]}>
                    {voted ? <Icon source="check-circle" size={14} color={social.colors.statusUnread} /> : null}
                    <Text variant="bodySmall" style={styles.flex}>
                      {option.label}
                    </Text>
                    {showResults ? (
                      <Text variant="labelSmall" style={styles.tabular}>
                        {Math.round(share * 100)}%
                      </Text>
                    ) : null}
                  </View>
                  {showResults ? (
                    <ProgressBar
                      progress={share}
                      color={voted ? social.colors.statusUnread : theme.colors.outline}
                      style={{ height: 3, borderRadius: theme.radii.pill, marginTop: 4 }}
                    />
                  ) : null}
                </View>
              </TouchableRipple>
            );
          })}
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {post.poll.totalVotes.toLocaleString()} votes
            {post.poll.closed ? ' · Final results' : post.poll.closesAt ? ' · Poll open' : ''}
          </Text>
        </View>
      ) : null}

      {post.fromCache ? (
        <View style={[styles.row, { gap: 4, paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.xs }]}>
          <Icon source="cloud-off-outline" size={12} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Showing a saved copy — you're offline
          </Text>
        </View>
      ) : null}

      {showActions && reactions ? (
        <View style={{ paddingHorizontal: compact ? theme.spacing.xs : theme.spacing.sm, paddingBottom: theme.spacing.xs }}>
          <ReactionBar
            state={reactions}
            compact={compact}
            animated={animated}
            onReactionChange={(reaction) => onReact?.(post.id, reaction)}
            onComment={onComment ? () => onComment(post.id) : undefined}
            onShare={onShare ? () => onShare(post.id) : undefined}
            onSave={onSave ? (next) => onSave(post.id, next) : undefined}
            testID={childTestID(id, 'reactions')}
          />
        </View>
      ) : null}

      <Divider />
    </Animated.View>
  );
});

export const PostCard = PostCardBase;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  quote: { borderWidth: 1 },
  link: { borderWidth: 1, overflow: 'hidden' },
  linkImage: { width: '100%', height: 140 },
  pollRow: { borderWidth: 1 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
