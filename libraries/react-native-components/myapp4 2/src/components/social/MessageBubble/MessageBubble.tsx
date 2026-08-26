import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Icon, Menu, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { MessageStatusIcon } from '../MessageStatus/MessageStatusIcon';
import { RichBody } from '../primitives/RichBody';
import { SocialAvatar } from '../primitives/SocialAvatar';
import { useSocialTheme } from '../theme/socialTokens';
import type { Attachment, Message } from '../types/domain';

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export interface MessageAction {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}

export interface MessageBubbleProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  message: Message;
  locale?: string;
  /** Group chats show the sender; one-to-one does not. */
  showSender?: boolean;
  /** Suppresses the avatar and name in a run from the same sender. */
  groupedWithPrevious?: boolean;
  readReceiptsDisabled?: boolean;
  onRetry?: (message: Message) => void;
  onPressReply?: (reference: NonNullable<Message['replyTo']>) => void;
  onPressAttachment?: (attachment: Attachment) => void;
  onReact?: (message: Message, emoji: string) => void;
  onPlayVoice?: (message: Message) => void;
  actions?: MessageAction[];
}

/**
 * A chat message.
 *
 * Alignment and bubble colour are *reinforcement*, never the message. The
 * accessible name carries sender, body, time and delivery status as one
 * sentence, and every action available on long-press is also reachable through
 * a labelled menu — a hidden gesture is not an affordance for keyboard or
 * switch users.
 *
 * A failed message stays in place with a retry rather than disappearing, which
 * is the difference between "your message didn't send" and "your message is gone".
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  locale = 'en-IN',
  showSender = false,
  groupedWithPrevious = false,
  readReceiptsDisabled = false,
  onRetry,
  onPressReply,
  onPressAttachment,
  onReact,
  onPlayVoice,
  actions = [],
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: MessageBubbleProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const motion = useMotion({ animated });
  const [menuOpen, setMenuOpen] = useState(false);

  const id = testID ?? `message-${message.id}`;
  const isSent = message.direction === 'sent';
  const failed = message.status === 'failed';
  const deleted = message.moderation && message.moderation !== 'visible';

  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.sentAt)),
    [locale, message.sentAt],
  );

  /** System messages are centred, unattributed and never look like a person. */
  if (message.system) {
    return (
      <View style={[styles.systemWrap, { paddingHorizontal: theme.spacing.md, marginVertical: 4 }]} testID={id}>
        <View
          style={[
            styles.systemBubble,
            { backgroundColor: social.colors.surfaceSystemMessage, borderRadius: theme.radii.md, padding: theme.spacing.sm },
          ]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`System message: ${message.body}`}
        >
          <Icon source="information-outline" size={13} color={social.colors.onSurfaceSystemMessage} />
          <Text
            variant="labelSmall"
            style={{ color: social.colors.onSurfaceSystemMessage, marginLeft: 6, flex: 1 }}
            selectable
          >
            {message.body}
          </Text>
        </View>
      </View>
    );
  }

  if (deleted) {
    return (
      <View
        style={[
          styles.wrap,
          { alignItems: isSent ? 'flex-end' : 'flex-start', paddingHorizontal: theme.spacing.md, marginTop: 4 },
        ]}
        testID={childTestID(id, 'deleted')}
      >
        <View
          style={[
            styles.bubble,
            styles.deletedBubble,
            { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.lg, padding: theme.spacing.sm },
          ]}
        >
          <Icon source="cancel" size={13} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 5, fontStyle: 'italic' }}>
            {message.moderation === 'deletedForEveryone'
              ? 'This message was deleted'
              : message.moderation === 'deletedForMe'
                ? 'You deleted this message'
                : 'This message was removed by a moderator'}
          </Text>
        </View>
      </View>
    );
  }

  const surface = isSent ? social.colors.surfaceMessageSent : social.colors.surfaceMessageReceived;
  const onSurface = isSent ? social.colors.onSurfaceMessageSent : social.colors.onSurfaceMessageReceived;

  /** Sender, content, time and status as one spoken sentence. */
  const accessibleName = [
    isSent ? 'You' : message.sender.displayName,
    message.replyTo ? `replying to ${message.replyTo.authorName}` : undefined,
    message.forwarded ? 'forwarded' : undefined,
    message.body,
    message.voiceDurationSeconds ? `voice message, ${formatDuration(message.voiceDurationSeconds)}` : undefined,
    message.attachments?.length ? `${message.attachments.length} attachment` : undefined,
    time,
    message.editedAt ? 'edited' : undefined,
    isSent ? (failed ? 'not sent' : message.status) : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        styles.wrap,
        {
          alignItems: isSent ? 'flex-end' : 'flex-start',
          paddingHorizontal: theme.spacing.md,
          marginTop: groupedWithPrevious ? 2 : theme.spacing.sm,
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <View style={[styles.row, { gap: 6, alignItems: 'flex-end', maxWidth: `${social.layout.bubbleMaxWidthPercent}%` }]}>
        {/* Group chats show who is speaking; a colour would not say it. */}
        {!isSent && showSender && !groupedWithPrevious ? (
          <SocialAvatar user={message.sender} size={26} />
        ) : !isSent && showSender ? (
          <View style={{ width: 26 }} />
        ) : null}

        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <TouchableRipple
              onLongPress={actions.length > 0 ? () => setMenuOpen(true) : undefined}
              onPress={failed && onRetry ? () => onRetry(message) : undefined}
              borderless
              style={{ borderRadius: theme.radii.lg }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={accessibleName}
              accessibilityHint={actions.length > 0 ? 'Long press for message options' : undefined}
              testID={childTestID(id, 'bubble')}
            >
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: surface,
                    borderRadius: theme.radii.lg,
                    padding: theme.spacing.sm,
                    borderWidth: failed ? 1 : 0,
                    borderColor: social.colors.statusError,
                  },
                ]}
              >
                {showSender && !isSent && !groupedWithPrevious ? (
                  <Text variant="labelSmall" style={{ color: social.colors.mention, marginBottom: 2 }}>
                    {message.sender.displayName}
                    {message.sender.roleLabel ? ` · ${message.sender.roleLabel}` : ''}
                  </Text>
                ) : null}

                {message.forwarded ? (
                  <View style={[styles.row, { gap: 3, marginBottom: 2 }]}>
                    <Icon source="share" size={11} color={onSurface} />
                    <Text variant="labelSmall" style={{ color: onSurface, opacity: 0.7, fontStyle: 'italic' }}>
                      Forwarded
                    </Text>
                  </View>
                ) : null}

                {/* Quoted reply is tappable back to its source. */}
                {message.replyTo ? (
                  <TouchableRipple
                    onPress={onPressReply ? () => onPressReply(message.replyTo!) : undefined}
                    disabled={!onPressReply}
                    style={[styles.reply, { borderLeftColor: social.colors.mention, borderRadius: theme.radii.sm }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Replying to ${message.replyTo.authorName}: ${message.replyTo.preview}. Go to the original message.`}
                    testID={childTestID(id, 'reply-quote')}
                  >
                    <View style={{ paddingLeft: 8, paddingVertical: 4 }}>
                      <Text variant="labelSmall" style={{ color: social.colors.mention }}>
                        {message.replyTo.authorName}
                      </Text>
                      <Text variant="labelSmall" numberOfLines={2} style={{ color: onSurface, opacity: 0.75 }}>
                        {message.replyTo.preview}
                      </Text>
                    </View>
                  </TouchableRipple>
                ) : null}

                {message.voiceDurationSeconds ? (
                  <TouchableRipple
                    onPress={onPlayVoice ? () => onPlayVoice(message) : undefined}
                    disabled={!onPlayVoice}
                    style={{ borderRadius: theme.radii.pill }}
                    accessibilityRole="button"
                    accessibilityLabel={`Play voice message, ${formatDuration(message.voiceDurationSeconds)}`}
                    testID={childTestID(id, 'voice')}
                  >
                    <View style={[styles.row, { gap: 8, paddingVertical: 4 }]}>
                      <Icon source="play-circle" size={26} color={onSurface} />
                      <View style={[styles.waveform, { gap: 2 }]}>
                        {Array.from({ length: 18 }).map((_, bar) => (
                          <View
                            key={bar}
                            style={{
                              width: 2,
                              height: 4 + ((bar * 7) % 14),
                              borderRadius: 1,
                              backgroundColor: onSurface,
                              opacity: 0.5,
                            }}
                          />
                        ))}
                      </View>
                      <Text variant="labelSmall" style={[styles.tabular, { color: onSurface }]}>
                        {formatDuration(message.voiceDurationSeconds)}
                      </Text>
                    </View>
                  </TouchableRipple>
                ) : null}

                {message.body ? (
                  <RichBody
                    body={message.body}
                    variant="bodyMedium"
                    color={onSurface}
                    truncateAt={600}
                    testID={childTestID(id, 'body')}
                  />
                ) : null}

                {message.attachments?.length ? (
                  <View style={{ gap: 4, marginTop: message.body ? 6 : 0 }}>
                    {message.attachments.map((attachment) => {
                      const busy = attachment.state === 'uploading' || attachment.state === 'scanning';
                      const blocked = attachment.state === 'blocked' || attachment.state === 'failed';

                      return (
                        <TouchableRipple
                          key={attachment.id}
                          onPress={
                            attachment.state === 'ready' && onPressAttachment
                              ? () => onPressAttachment(attachment)
                              : undefined
                          }
                          disabled={attachment.state !== 'ready'}
                          style={[
                            styles.attachment,
                            { borderColor: blocked ? social.colors.statusError : theme.colors.outlineVariant, borderRadius: theme.radii.sm },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${attachment.name}${
                            attachment.size ? `, ${formatSize(attachment.size)}` : ''
                          }${busy ? ', uploading' : blocked ? `, ${attachment.blockedReason ?? 'unavailable'}` : ''}`}
                          testID={childTestID(id, `attachment-${attachment.id}`)}
                        >
                          <View style={{ padding: 6, gap: 3 }}>
                            <View style={[styles.row, { gap: 5 }]}>
                              <Icon
                                source={attachment.mimeType.startsWith('image/') ? 'image-outline' : 'file-outline'}
                                size={15}
                                color={blocked ? social.colors.statusError : onSurface}
                              />
                              <Text variant="labelSmall" numberOfLines={1} style={[styles.flex, { color: onSurface }]}>
                                {attachment.name}
                              </Text>
                              {busy ? <ActivityIndicator size={11} /> : null}
                            </View>
                            {attachment.state === 'uploading' && attachment.progress != null ? (
                              <ProgressBar progress={attachment.progress} style={{ height: 2, borderRadius: 2 }} />
                            ) : null}
                            {blocked ? (
                              <Text variant="labelSmall" style={{ color: social.colors.statusError }}>
                                {attachment.blockedReason ?? 'Attachment unavailable'}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableRipple>
                      );
                    })}
                  </View>
                ) : null}

                <View style={[styles.metaRow, { gap: 4, marginTop: 3 }]}>
                  {message.editedAt ? (
                    <Text variant="labelSmall" style={{ color: onSurface, opacity: 0.65 }}>
                      Edited
                    </Text>
                  ) : null}
                  {message.expiresAt ? (
                    <Icon source="timer-sand" size={10} color={onSurface} />
                  ) : null}
                  <Text variant="labelSmall" style={{ color: onSurface, opacity: 0.7 }}>
                    {time}
                  </Text>
                  {isSent ? (
                    <MessageStatusIcon
                      status={message.status}
                      readReceiptsDisabled={readReceiptsDisabled}
                      testID={childTestID(id, 'status')}
                    />
                  ) : null}
                </View>
              </View>
            </TouchableRipple>
          }
        >
          {actions.map((action) => (
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

        {/* Same actions reachable without a long press. */}
        {actions.length > 0 ? (
          <TouchableRipple
            onPress={() => setMenuOpen(true)}
            borderless
            style={{ padding: 4, borderRadius: 16 }}
            accessibilityRole="button"
            accessibilityLabel={`Message options for ${isSent ? 'your message' : message.sender.displayName}`}
            testID={childTestID(id, 'menu')}
          >
            <Icon source="dots-vertical" size={14} color={theme.colors.onSurfaceVariant} />
          </TouchableRipple>
        ) : null}
      </View>

      {message.reactions?.length ? (
        <View style={[styles.reactionRow, { gap: 4, marginTop: -4 }]}>
          {message.reactions.map((reaction) => (
            <TouchableRipple
              key={reaction.emoji}
              onPress={onReact ? () => onReact(message, reaction.emoji) : undefined}
              disabled={!onReact}
              borderless
              style={{ borderRadius: theme.radii.pill }}
              accessibilityRole="button"
              accessibilityState={{ selected: reaction.reactedByMe }}
              accessibilityLabel={`${reaction.emoji} reaction, ${reaction.count}${
                reaction.reactedByMe ? ', including yours' : ''
              }`}
              testID={childTestID(id, `reaction-${reaction.emoji}`)}
            >
              <View
                style={[
                  styles.reactionChip,
                  {
                    backgroundColor: reaction.reactedByMe
                      ? social.colors.reactionSelectedSurface
                      : social.colors.reactionSurface,
                    borderRadius: theme.radii.pill,
                  },
                ]}
              >
                <Text variant="labelSmall">{reaction.emoji}</Text>
                <Text variant="labelSmall" style={{ marginLeft: 3, color: theme.colors.onSurfaceVariant }}>
                  {reaction.count}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </View>
      ) : null}

      {/* A failed message never silently vanishes. */}
      {failed ? (
        <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
          <Icon source="alert-circle-outline" size={12} color={social.colors.statusError} />
          <Text
            variant="labelSmall"
            onPress={onRetry ? () => onRetry(message) : undefined}
            accessibilityRole="button"
            accessibilityLabel="Message failed to send. Tap to retry."
            style={{ color: social.colors.statusError }}
            testID={childTestID(id, 'retry')}
          >
            Message failed. Tap to retry.
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  bubble: { overflow: 'hidden' },
  deletedBubble: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  reply: { borderLeftWidth: 3, marginBottom: 5 },
  attachment: { borderWidth: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap' },
  reactionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2 },
  systemWrap: { alignItems: 'center' },
  systemBubble: { flexDirection: 'row', alignItems: 'center', maxWidth: '92%' },
  waveform: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
