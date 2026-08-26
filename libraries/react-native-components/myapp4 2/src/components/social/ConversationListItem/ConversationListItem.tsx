import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Icon, Text } from 'react-native-paper';

import { ListItemRow, type SwipeAction } from '@ui/molecules/ListItemRow';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { AnimatableProps } from '@/hooks';

import { MessageStatusIcon } from '../MessageStatus/MessageStatusIcon';
import { SocialAvatar } from '../primitives/SocialAvatar';
import { useSocialTheme } from '../theme/socialTokens';
import type { Conversation } from '../types/domain';

const KIND_PREVIEW: Record<string, { label: string; icon: string }> = {
  photo: { label: 'Photo', icon: 'image-outline' },
  video: { label: 'Video', icon: 'video-outline' },
  voice: { label: 'Voice message', icon: 'microphone-outline' },
  document: { label: 'Document', icon: 'file-outline' },
  unavailable: { label: 'Message unavailable', icon: 'help-circle-outline' },
};

export interface ConversationListItemProps extends Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  conversation: Conversation;
  locale?: string;
  loading?: boolean;
  selected?: boolean;
  onPress?: (conversation: Conversation) => void;
  onLongPress?: (conversation: Conversation) => void;
  /** Swipe shortcuts. Everything here must also exist in the overflow menu. */
  swipeActions?: { left?: SwipeAction[]; right?: SwipeAction[] };
  readReceiptsDisabled?: boolean;
  testID?: string;
}

/**
 * A row in the conversation list.
 *
 * Unread is communicated by a badge, a weight change *and* the word "unread" in
 * the accessible name — never by a background tint alone, which vanishes in
 * high-contrast mode and says nothing to a screen reader.
 *
 * The preview keeps its message *type* when there is no text: "Photo", "Voice
 * message", "Document" — an empty preview row is a bug, not a blank state.
 */
export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  locale = 'en-IN',
  loading = false,
  selected = false,
  onPress,
  onLongPress,
  swipeActions,
  readReceiptsDisabled = false,
  animated = true,
  entering = false,
  index = 0,
  testID,
}: ConversationListItemProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const id = testID ?? `conversation-${conversation.id}`;
  const unread = (conversation.unreadCount ?? 0) > 0;
  const typing = (conversation.typingUsers?.length ?? 0) > 0;
  const hasDraft = !!conversation.draft && !typing;

  const timeLabel = useMemo(
    () => (conversation.lastMessageAt ? formatRelativeDate(conversation.lastMessageAt, locale) : ''),
    [conversation.lastMessageAt, locale],
  );

  /** Typing beats draft beats the last message — most current wins. */
  const preview = useMemo(() => {
    if (typing) {
      const [first] = conversation.typingUsers!;
      return {
        text:
          conversation.typingUsers!.length === 1 && conversation.kind !== 'direct'
            ? `${first} is typing…`
            : 'Typing…',
        icon: undefined,
        tone: 'typing' as const,
      };
    }
    if (hasDraft) {
      return { text: conversation.draft!, icon: 'pencil-outline', tone: 'draft' as const };
    }
    const kind = conversation.lastMessageKind;
    if (kind && kind !== 'text') {
      const meta = KIND_PREVIEW[kind];
      // Type is preserved when there is no text to preview.
      return { text: conversation.lastMessagePreview ?? meta?.label ?? 'Message', icon: meta?.icon, tone: 'normal' as const };
    }
    return { text: conversation.lastMessagePreview ?? 'No messages yet', icon: undefined, tone: 'normal' as const };
  }, [conversation, hasDraft, typing]);

  /** The whole row as one sentence. */
  const accessibleName = useMemo(
    () =>
      [
        conversation.title,
        conversation.kind === 'group' ? 'group' : conversation.kind === 'channel' ? 'channel' : undefined,
        unread ? `${conversation.unreadCount} unread` : undefined,
        conversation.mentionCount ? `${conversation.mentionCount} mentions` : undefined,
        typing ? 'typing now' : hasDraft ? 'you have a draft' : preview.text,
        timeLabel ? `last message ${timeLabel}` : undefined,
        conversation.muted ? 'muted' : undefined,
        conversation.pinned ? 'pinned' : undefined,
        conversation.syncFailed ? 'sync failed' : undefined,
      ]
        .filter(Boolean)
        .join(', '),
    [conversation, hasDraft, preview.text, timeLabel, typing, unread],
  );

  if (loading) {
    return (
      <View style={[styles.row, { padding: theme.spacing.md, gap: theme.spacing.md }]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="circle" height={social.layout.avatarLg} />
        <View style={styles.flex}>
          <SkeletonLoader shape="text" lines={2} />
        </View>
      </View>
    );
  }

  return (
    <ListItemRow
      title={conversation.title}
      subtitle={preview.text}
      size="lg"
      selected={selected}
      divider
      animated={animated}
      entering={entering}
      index={index}
      swipeActions={swipeActions}
      onPress={onPress ? () => onPress(conversation) : undefined}
      onLongPress={onLongPress ? () => onLongPress(conversation) : undefined}
      testID={id}
      leading={
        <View>
          <SocialAvatar
            user={{
              id: conversation.id,
              displayName: conversation.title,
              avatar: conversation.avatar,
              presence: conversation.presence,
            }}
            size={social.layout.avatarLg}
            showPresence={conversation.kind === 'direct'}
          />
          {conversation.kind === 'group' ? (
            <View style={[styles.kindPip, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill }]}>
              <Icon source="account-group" size={11} color={theme.colors.onSurfaceVariant} />
            </View>
          ) : null}
        </View>
      }
      trailing={
        <View style={styles.trailing}>
          <Text
            variant="labelSmall"
            style={{ color: unread ? social.colors.statusUnread : theme.colors.onSurfaceVariant }}
          >
            {timeLabel}
          </Text>

          <View style={[styles.row, { gap: 4, marginTop: 3 }]}>
            {conversation.pinned ? <Icon source="pin" size={12} color={theme.colors.onSurfaceVariant} /> : null}
            {conversation.muted ? <Icon source="bell-off-outline" size={12} color={theme.colors.onSurfaceVariant} /> : null}

            {/* Mentions get their own badge — they are not just "more unread". */}
            {conversation.mentionCount ? (
              <Badge size={17} style={{ backgroundColor: social.colors.mention }}>
                {`@${conversation.mentionCount}`}
              </Badge>
            ) : null}

            {unread ? (
              <Badge size={17} style={{ backgroundColor: social.colors.statusUnread }}>
                {conversation.unreadCount!}
              </Badge>
            ) : conversation.lastMessageStatus && !typing && !hasDraft ? (
              <MessageStatusIcon
                status={conversation.lastMessageStatus}
                readReceiptsDisabled={readReceiptsDisabled}
                size={12}
              />
            ) : null}
          </View>
        </View>
      }
      // The row's own label carries the full summary.
      {...{ accessibilityLabel: accessibleName }}
    />
  );
});

export interface ConversationPreviewLineProps {
  conversation: Conversation;
  testID?: string;
}

/**
 * The preview line, exported separately so a split-view layout can render it in
 * a different arrangement without re-deriving the typing/draft precedence.
 */
export const ConversationPreviewLine = memo(function ConversationPreviewLine({
  conversation,
  testID,
}: ConversationPreviewLineProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const typing = (conversation.typingUsers?.length ?? 0) > 0;
  const hasDraft = !!conversation.draft && !typing;
  const unread = (conversation.unreadCount ?? 0) > 0;

  const kindMeta = conversation.lastMessageKind ? KIND_PREVIEW[conversation.lastMessageKind] : undefined;

  return (
    <View style={[styles.row, { gap: 4 }]} testID={testID}>
      {typing ? (
        <Text variant="bodySmall" style={{ color: social.colors.statusOnline }} numberOfLines={1}>
          Typing…
        </Text>
      ) : hasDraft ? (
        <>
          <Text variant="bodySmall" style={{ color: social.colors.statusError }}>
            Draft:
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
            {conversation.draft}
          </Text>
        </>
      ) : (
        <>
          {kindMeta ? <Icon source={kindMeta.icon} size={13} color={theme.colors.onSurfaceVariant} /> : null}
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[
              styles.flex,
              { color: unread ? theme.colors.onSurface : theme.colors.onSurfaceVariant, fontWeight: unread ? '600' : '400' },
            ]}
          >
            {conversation.lastMessagePreview ?? kindMeta?.label ?? 'No messages yet'}
          </Text>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  trailing: { alignItems: 'flex-end', minWidth: 60 },
  kindPip: { position: 'absolute', bottom: -2, left: -2, padding: 2 },
  flex: { flex: 1 },
});
