import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppTextInput } from '@ui/atoms/AppTextInput';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { SocialAvatar } from '../primitives/SocialAvatar';
import { useSocialTheme } from '../theme/socialTokens';
import type { Comment, UserSummary } from '../types/domain';

export interface CommentInputBarProps extends StyleEscapeHatches {
  currentUser: UserSummary;
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Reply context shown above the field, with a way to clear it. */
  replyingTo?: Comment;
  onCancelReply?: () => void;
  /** Editing an existing comment rather than writing a new one. */
  editing?: boolean;
  onCancelEdit?: () => void;
  onOpenEmoji?: () => void;
  onAttach?: () => void;
  onMentionTrigger?: () => void;
  sending?: boolean;
  maxLength?: number;
  /** Comments turned off, rate-limited, or account restricted. */
  disabledReason?: string;
  /** Draft was recovered after navigation or a crash. */
  draftRestored?: boolean;
  placeholder?: string;
}

/**
 * The comment composer.
 *
 * A real text field, not a tappable div — so the platform keyboard, dictation,
 * autocorrect and screen readers all behave normally. Send stays disabled only
 * while there is genuinely nothing to send, and drafts survive navigation
 * because losing a half-written comment is the fastest way to stop someone
 * commenting again.
 */
export const CommentInputBar = ({
  currentUser,
  value,
  onChangeText,
  onSubmit,
  replyingTo,
  onCancelReply,
  editing = false,
  onCancelEdit,
  onOpenEmoji,
  onAttach,
  onMentionTrigger,
  sending = false,
  maxLength = 2200,
  disabledReason,
  draftRestored = false,
  placeholder = 'Add a comment…',
  style,
  containerStyle,
  testID,
}: CommentInputBarProps) => {
  const theme = useAppTheme();
  const social = useSocialTheme();

  const id = testID ?? 'comment-input';
  const disabled = !!disabledReason;
  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !sending && !disabled;
  const nearLimit = value.length > maxLength * 0.9;

  const submit = useCallback(() => {
    if (!canSend) return;
    onSubmit(trimmed);
  }, [canSend, onSubmit, trimmed]);

  if (disabled) {
    return (
      <View
        style={[
          styles.disabled,
          { backgroundColor: social.colors.surfaceFeedAlt, padding: theme.spacing.md, gap: 4 },
          containerStyle,
        ]}
        testID={childTestID(id, 'disabled')}
      >
        <View style={[styles.row, { gap: 6 }]}>
          <Icon source="comment-off-outline" size={15} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {disabledReason}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        { backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      {/* Reply / edit context sits above the field with a clear escape. */}
      {replyingTo || editing ? (
        <View
          style={[
            styles.contextRow,
            { backgroundColor: social.colors.surfaceSelected, paddingHorizontal: theme.spacing.md, paddingVertical: 6 },
          ]}
        >
          <Icon
            source={editing ? 'pencil-outline' : 'reply'}
            size={13}
            color={social.colors.onSurfaceSelected}
          />
          <Text variant="labelSmall" style={{ color: social.colors.onSurfaceSelected, flex: 1, marginLeft: 6 }} numberOfLines={1}>
            {editing ? 'Editing your comment' : `Replying to ${replyingTo?.author.displayName}`}
          </Text>
          <TouchableRipple
            onPress={editing ? onCancelEdit : onCancelReply}
            borderless
            style={{ padding: 4, borderRadius: 20 }}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Cancel editing' : 'Cancel reply'}
            testID={childTestID(id, 'cancel-context')}
          >
            <Icon source="close" size={14} color={social.colors.onSurfaceSelected} />
          </TouchableRipple>
        </View>
      ) : null}

      {draftRestored ? (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: theme.spacing.md, paddingTop: 4 }}
        >
          We restored your draft.
        </Text>
      ) : null}

      <View style={[styles.row, { padding: theme.spacing.sm, gap: theme.spacing.xs, alignItems: 'flex-end' }]}>
        <SocialAvatar user={currentUser} size={social.layout.avatarSm} />

        <View style={styles.flex}>
          <AppTextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            multiline
            numberOfLines={1}
            maxLength={maxLength}
            showCounter={nearLimit}
            accessibilityLabel={editing ? 'Edit your comment' : replyingTo ? `Reply to ${replyingTo.author.displayName}` : 'Add a comment'}
            testID={childTestID(id, 'field')}
          />
        </View>
      </View>

      <View style={[styles.row, { paddingHorizontal: theme.spacing.sm, paddingBottom: theme.spacing.sm, gap: theme.spacing.xs }]}>
        {onOpenEmoji ? (
          <ToolButton icon="emoticon-outline" label="Add emoji" onPress={onOpenEmoji} testID={childTestID(id, 'emoji')} />
        ) : null}
        {onMentionTrigger ? (
          <ToolButton icon="at" label="Mention someone" onPress={onMentionTrigger} testID={childTestID(id, 'mention')} />
        ) : null}
        {onAttach ? (
          <ToolButton icon="image-outline" label="Attach an image" onPress={onAttach} testID={childTestID(id, 'attach')} />
        ) : null}

        <View style={styles.flex} />

        <TouchableRipple
          onPress={submit}
          disabled={!canSend}
          borderless
          style={[
            styles.send,
            {
              borderRadius: theme.radii.pill,
              backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceVariant,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Save changes' : 'Post comment'}
          accessibilityState={{ disabled: !canSend, busy: sending }}
          testID={childTestID(id, 'send')}
        >
          <View style={[styles.row, { gap: 4, paddingHorizontal: theme.spacing.md, paddingVertical: 7 }]}>
            {sending ? (
              <ActivityIndicator size={14} color={theme.colors.onPrimary} />
            ) : (
              <Icon source="send" size={15} color={canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
            )}
            <Text
              variant="labelMedium"
              style={{ color: canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
            >
              {editing ? 'Save' : 'Post'}
            </Text>
          </View>
        </TouchableRipple>
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
      style={{ padding: 7, borderRadius: 20 }}
      // Every tool button has a spoken name, not just a glyph.
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  contextRow: { flexDirection: 'row', alignItems: 'center' },
  send: { overflow: 'hidden' },
  disabled: {},
  flex: { flex: 1 },
});
