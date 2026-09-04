import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Menu, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { AppTextInput } from '@ui/atoms/AppTextInput';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSocialTheme } from '../theme/socialTokens';
import type { Attachment, Message, MessageReference } from '../types/domain';

export interface AttachmentOption {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

export interface ChatInputBarProps extends StyleEscapeHatches {
  value: string;
  onChangeText: (value: string) => void;
  onSend: (value: string) => void;
  placeholder?: string;
  /** Reply context above the composer, with a way to clear it. */
  replyTo?: MessageReference;
  onCancelReply?: () => void;
  /** Editing an existing message rather than composing a new one. */
  editingMessage?: Message;
  onCancelEdit?: () => void;
  attachments?: Attachment[];
  onRemoveAttachment?: (attachment: Attachment) => void;
  attachmentOptions?: AttachmentOption[];
  onOpenEmoji?: () => void;
  onMentionTrigger?: () => void;
  /** Voice recording. Tap to start and tap to stop — never hold-only. */
  recordingState?: RecordingState;
  recordingSeconds?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  sending?: boolean;
  maxLength?: number;
  /** Read-only, moderated, or blocked — explained rather than just disabled. */
  disabledReason?: string;
  /** Seconds remaining under slow mode. */
  slowModeSeconds?: number;
  offline?: boolean;
  onTypingChange?: (typing: boolean) => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * The message composer.
 *
 * Voice recording is tap-to-start and tap-to-stop, with an explicit cancel —
 * press-and-hold as the *only* way to record excludes anyone who cannot hold a
 * steady touch, which is precisely the group most likely to prefer voice.
 *
 * Send stays enabled whenever there is something sendable, including while an
 * attachment is still uploading — the bar says the upload will continue rather
 * than blocking the user behind a progress bar.
 */
export const ChatInputBar = ({
  value,
  onChangeText,
  onSend,
  placeholder = 'Type a message',
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  attachments = [],
  onRemoveAttachment,
  attachmentOptions = [],
  onOpenEmoji,
  onMentionTrigger,
  recordingState = 'idle',
  recordingSeconds = 0,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  sending = false,
  maxLength = 4000,
  disabledReason,
  slowModeSeconds,
  offline = false,
  onTypingChange,
  style,
  containerStyle,
  testID,
}: ChatInputBarProps) => {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const id = testID ?? 'chat-input';
  const disabled = !!disabledReason;
  const recording = recordingState === 'recording' || recordingState === 'paused';
  const rateLimited = (slowModeSeconds ?? 0) > 0;

  const trimmed = value.trim();
  const hasUploadingAttachment = attachments.some((item) => item.state === 'uploading');
  // Sendable if there is text or at least one attachment that is not blocked.
  const hasContent = trimmed.length > 0 || attachments.some((item) => item.state !== 'blocked' && item.state !== 'failed');
  const canSend = hasContent && !sending && !disabled && !rateLimited;

  /** Debounced typing signal so we don't spam the presence channel. */
  const handleChange = useCallback(
    (next: string) => {
      onChangeText(next);
      if (!onTypingChange) return;
      onTypingChange(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onTypingChange(false), 2500);
    },
    [onChangeText, onTypingChange],
  );

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
    [],
  );

  const submit = useCallback(() => {
    if (!canSend) return;
    onSend(trimmed);
  }, [canSend, onSend, trimmed]);

  if (disabled) {
    return (
      <View
        style={[
          { backgroundColor: social.colors.surfaceFeedAlt, padding: theme.spacing.md },
          containerStyle,
        ]}
        testID={childTestID(id, 'disabled')}
      >
        <View style={[styles.row, { gap: 6 }]}>
          <Icon source="lock-outline" size={15} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
            {disabledReason}
          </Text>
        </View>
      </View>
    );
  }

  /** Recording takes over the bar entirely, with three labelled controls. */
  if (recording) {
    return (
      <View
        style={[
          styles.recordingBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
            padding: theme.spacing.sm,
            gap: theme.spacing.sm,
          },
          containerStyle,
        ]}
        testID={childTestID(id, 'recording')}
      >
        <TouchableRipple
          onPress={onCancelRecording}
          borderless
          style={{ padding: 9, borderRadius: 22 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel recording"
          testID={childTestID(id, 'cancel-recording')}
        >
          <Icon source="delete-outline" size={20} color={social.colors.statusError} />
        </TouchableRipple>

        <View style={[styles.row, styles.flex, { gap: 8 }]}>
          <View style={[styles.recordDot, { backgroundColor: social.colors.statusError }]} />
          <Text
            variant="labelMedium"
            style={styles.tabular}
            // Duration is announced politely as it changes.
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Recording, ${formatDuration(recordingSeconds)}`}
          >
            {formatDuration(recordingSeconds)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Recording…
          </Text>
        </View>

        <TouchableRipple
          onPress={onStopRecording}
          borderless
          style={[styles.sendCircle, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill }]}
          accessibilityRole="button"
          accessibilityLabel="Stop recording and send"
          testID={childTestID(id, 'stop-recording')}
        >
          <Icon source="send" size={18} color={theme.colors.onPrimary} />
        </TouchableRipple>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.outlineVariant,
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      {/* Reply / edit context with a clear escape. */}
      {replyTo || editingMessage ? (
        <View
          style={[
            styles.contextRow,
            { backgroundColor: social.colors.surfaceSelected, paddingHorizontal: theme.spacing.md, paddingVertical: 6 },
          ]}
        >
          <Icon
            source={editingMessage ? 'pencil-outline' : 'reply'}
            size={13}
            color={social.colors.onSurfaceSelected}
          />
          <View style={[styles.flex, { marginLeft: 6 }]}>
            <Text variant="labelSmall" style={{ color: social.colors.onSurfaceSelected }}>
              {editingMessage ? 'Editing message' : `Replying to ${replyTo?.authorName}`}
            </Text>
            {replyTo ? (
              <Text variant="labelSmall" numberOfLines={1} style={{ color: social.colors.onSurfaceSelected, opacity: 0.75 }}>
                {replyTo.preview}
              </Text>
            ) : null}
          </View>
          <TouchableRipple
            onPress={editingMessage ? onCancelEdit : onCancelReply}
            borderless
            style={{ padding: 4, borderRadius: 20 }}
            accessibilityRole="button"
            accessibilityLabel={editingMessage ? 'Cancel editing' : 'Cancel reply'}
            testID={childTestID(id, 'cancel-context')}
          >
            <Icon source="close" size={15} color={social.colors.onSurfaceSelected} />
          </TouchableRipple>
        </View>
      ) : null}

      {/* Attachment previews with per-item progress and removal. */}
      {attachments.length > 0 ? (
        <View style={{ paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.xs, gap: 4 }}>
          {attachments.map((attachment) => {
            const blocked = attachment.state === 'blocked' || attachment.state === 'failed';
            return (
              <View
                key={attachment.id}
                style={[
                  styles.attachmentRow,
                  {
                    borderColor: blocked ? social.colors.statusError : theme.colors.outlineVariant,
                    borderRadius: theme.radii.sm,
                    padding: 6,
                    gap: 6,
                  },
                ]}
                testID={childTestID(id, `attachment-${attachment.id}`)}
              >
                <Icon
                  source={attachment.mimeType.startsWith('image/') ? 'image-outline' : 'file-outline'}
                  size={16}
                  color={blocked ? social.colors.statusError : theme.colors.onSurfaceVariant}
                />
                <View style={styles.flex}>
                  <Text variant="labelSmall" numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  {attachment.state === 'uploading' && attachment.progress != null ? (
                    <ProgressBar
                      progress={attachment.progress}
                      style={{ height: 2, borderRadius: 2, marginTop: 3 }}
                      accessibilityLabel={`Uploading ${attachment.name}, ${Math.round(attachment.progress * 100)} percent`}
                    />
                  ) : null}
                  {blocked ? (
                    <Text variant="labelSmall" style={{ color: social.colors.statusError }}>
                      {attachment.blockedReason ?? 'Upload failed. Try again.'}
                    </Text>
                  ) : null}
                </View>
                {onRemoveAttachment ? (
                  <TouchableRipple
                    onPress={() => onRemoveAttachment(attachment)}
                    borderless
                    style={{ padding: 4, borderRadius: 16 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${attachment.name}`}
                    testID={childTestID(id, `remove-${attachment.id}`)}
                  >
                    <Icon source="close" size={13} color={theme.colors.onSurfaceVariant} />
                  </TouchableRipple>
                ) : null}
              </View>
            );
          })}

          {hasUploadingAttachment ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              You can send now — the upload finishes in the background.
            </Text>
          ) : null}
        </View>
      ) : null}

      {offline ? (
        <View style={[styles.row, { gap: 5, paddingHorizontal: theme.spacing.md, paddingTop: 6 }]}>
          <Icon source="cloud-off-outline" size={13} color={social.colors.statusPending} />
          <Text variant="labelSmall" style={{ color: social.colors.statusPending }}>
            You're offline. Messages will send when you reconnect.
          </Text>
        </View>
      ) : null}

      {rateLimited ? (
        <View style={[styles.row, { gap: 5, paddingHorizontal: theme.spacing.md, paddingTop: 6 }]}>
          <Icon source="timer-sand" size={13} color={social.colors.statusPending} />
          <Text variant="labelSmall" style={{ color: social.colors.statusPending }} accessibilityLiveRegion="polite">
            You're in slow mode. Try again in {slowModeSeconds} second{slowModeSeconds === 1 ? '' : 's'}.
          </Text>
        </View>
      ) : null}

      <View style={[styles.row, { padding: theme.spacing.sm, gap: 4, alignItems: 'flex-end' }]}>
        {attachmentOptions.length > 0 ? (
          <Menu
            visible={attachMenuOpen}
            onDismiss={() => setAttachMenuOpen(false)}
            anchor={
              <ToolButton
                icon="plus-circle-outline"
                label="Attach a file"
                onPress={() => setAttachMenuOpen(true)}
                testID={childTestID(id, 'attach')}
              />
            }
          >
            {attachmentOptions.map((option) => (
              <Menu.Item
                key={option.key}
                title={option.label}
                leadingIcon={option.icon}
                onPress={() => {
                  setAttachMenuOpen(false);
                  option.onPress();
                }}
                testID={childTestID(id, `attach-${option.key}`)}
              />
            ))}
          </Menu>
        ) : null}

        <View style={[styles.flex, { minHeight: social.layout.composerMinHeight }]}>
          <AppTextInput
            value={value}
            onChangeText={handleChange}
            placeholder={placeholder}
            multiline
            numberOfLines={1}
            maxLength={maxLength}
            showCounter={value.length > maxLength * 0.9}
            accessibilityLabel={editingMessage ? 'Edit message' : replyTo ? `Reply to ${replyTo.authorName}` : 'Type a message'}
            testID={childTestID(id, 'field')}
          />
        </View>

        {onOpenEmoji ? (
          <ToolButton icon="emoticon-outline" label="Add emoji" onPress={onOpenEmoji} testID={childTestID(id, 'emoji')} />
        ) : null}
        {onMentionTrigger ? (
          <ToolButton icon="at" label="Mention someone" onPress={onMentionTrigger} testID={childTestID(id, 'mention')} />
        ) : null}

        {/* Voice when empty, send when there is something to send. */}
        {!hasContent && onStartRecording ? (
          <TouchableRipple
            onPress={onStartRecording}
            borderless
            style={[styles.sendCircle, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}
            accessibilityRole="button"
            // Tap to start; there is also an explicit stop and cancel.
            accessibilityLabel="Record a voice message"
            accessibilityHint="Tap to start recording. Tap again to send."
            testID={childTestID(id, 'record')}
          >
            <Icon source="microphone" size={19} color={theme.colors.onSurfaceVariant} />
          </TouchableRipple>
        ) : (
          <TouchableRipple
            onPress={submit}
            disabled={!canSend}
            borderless
            style={[
              styles.sendCircle,
              {
                backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceVariant,
                borderRadius: theme.radii.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={editingMessage ? 'Save changes' : 'Send message'}
            accessibilityState={{ disabled: !canSend, busy: sending }}
            testID={childTestID(id, 'send')}
          >
            {sending ? (
              <ActivityIndicator size={16} color={theme.colors.onPrimary} />
            ) : (
              <Icon
                source={editingMessage ? 'check' : 'send'}
                size={18}
                color={canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
              />
            )}
          </TouchableRipple>
        )}
      </View>
    </View>
  );
};

const ToolButton = ({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={{ padding: 8, borderRadius: 22 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Icon source={icon} size={20} color={theme.colors.onSurfaceVariant} />
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  contextRow: { flexDirection: 'row', alignItems: 'center' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  recordingBar: { flexDirection: 'row', alignItems: 'center' },
  recordDot: { width: 8, height: 8, borderRadius: 4 },
  sendCircle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
