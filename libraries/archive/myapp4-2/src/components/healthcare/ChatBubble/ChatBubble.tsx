import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useHealthTheme } from '../theme/healthcareTokens';
import type { Attachment, ChatMessage, MessageStatus } from '../types/domain';

const STATUS_META: Record<MessageStatus, { label: string; icon?: string }> = {
  draft: { label: 'Draft' },
  sending: { label: 'Sending…' },
  sent: { label: 'Sent', icon: 'check' },
  delivered: { label: 'Delivered', icon: 'check-all' },
  read: { label: 'Read by your care team', icon: 'check-all' },
  failed: { label: 'Not sent', icon: 'alert-circle-outline' },
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface AttachmentCardProps {
  attachment: Attachment;
  onPress?: (attachment: Attachment) => void;
  onRetry?: (attachment: Attachment) => void;
  testID?: string;
}

/** Attachments show their upload and scanning states rather than hanging. */
export const AttachmentCard = ({ attachment, onPress, onRetry, testID }: AttachmentCardProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();

  const isImage = attachment.mimeType.startsWith('image/');
  const busy = attachment.state === 'uploading' || attachment.state === 'scanning';
  const blocked = attachment.state === 'blocked' || attachment.state === 'failed';

  return (
    <TouchableRipple
      onPress={attachment.state === 'ready' && onPress ? () => onPress(attachment) : undefined}
      disabled={attachment.state !== 'ready' || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`${isImage ? 'Image' : 'Document'} ${attachment.name}${
        attachment.size ? `, ${formatSize(attachment.size)}` : ''
      }${busy ? ', uploading' : blocked ? `, ${attachment.blockedReason ?? 'could not be attached'}` : ''}`}
      style={[
        styles.attachment,
        {
          borderColor: blocked ? health.colors.urgentAccent : theme.colors.outlineVariant,
          borderRadius: theme.radii.md,
          padding: theme.spacing.sm,
        },
      ]}
      testID={testID}
    >
      <View style={{ gap: 4 }}>
        <View style={[styles.row, { gap: theme.spacing.xs }]}>
          <Icon
            source={isImage ? 'image-outline' : 'file-pdf-box'}
            size={18}
            color={blocked ? health.colors.urgentAccent : theme.colors.onSurfaceVariant}
          />
          <View style={styles.flex}>
            <Text variant="labelMedium" numberOfLines={1}>
              {attachment.name}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatSize(attachment.size)}
              {attachment.state === 'scanning' ? ' · checking for viruses' : ''}
            </Text>
          </View>
          {busy ? <ActivityIndicator size={14} /> : null}
        </View>

        {attachment.state === 'uploading' && attachment.progress != null ? (
          <ProgressBar progress={attachment.progress} style={{ height: 3, borderRadius: theme.radii.pill }} />
        ) : null}

        {blocked ? (
          <View style={[styles.row, { gap: 4 }]}>
            <Text variant="labelSmall" style={{ color: health.colors.urgentAccent, flex: 1 }}>
              {attachment.blockedReason ?? 'This file could not be attached.'}
            </Text>
            {onRetry ? (
              <Text
                variant="labelSmall"
                onPress={() => onRetry(attachment)}
                accessibilityRole="button"
                style={{ color: theme.colors.primary }}
              >
                Retry
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

export interface ChatBubbleProps extends Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  message: ChatMessage;
  locale?: string;
  /** Suppresses the repeated sender label in a run of messages. */
  groupedWithPrevious?: boolean;
  onRetry?: (message: ChatMessage) => void;
  onAttachmentPress?: (attachment: Attachment) => void;
  onTranslate?: (message: ChatMessage) => void;
  testID?: string;
}

/**
 * A message in a secure care-team thread.
 *
 * Sender is communicated by alignment, an explicit sender label and accessible
 * semantics — never by bubble colour alone, which is invisible to a screen
 * reader and ambiguous in monochrome. Message text stays selectable.
 */
export const ChatBubble = memo(function ChatBubble({
  message,
  locale = 'en-IN',
  groupedWithPrevious = false,
  onRetry,
  onAttachmentPress,
  onTranslate,
  animated = true,
  entering = false,
  index = 0,
  testID,
}: ChatBubbleProps) {
  const theme = useAppTheme();
  const health = useHealthTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `msg-${message.id}`;
  const isPatient = message.sender === 'patient';
  const isSystem = message.sender === 'system';
  const statusMeta = STATUS_META[message.status];

  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt)),
    [locale, message.createdAt],
  );

  const senderLabel = isSystem ? 'System' : isPatient ? 'You' : message.senderName ?? 'Your care team';

  const surface = isSystem
    ? health.colors.chatSystemSurface
    : isPatient
      ? health.colors.chatPatientSurface
      : health.colors.chatClinicianSurface;

  const onSurface = isSystem
    ? health.colors.onChatSystemSurface
    : isPatient
      ? health.colors.onChatPatientSurface
      : health.colors.onChatClinicianSurface;

  if (isSystem) {
    return (
      <Animated.View
        entering={motion.entering(entering, index)}
        style={[styles.systemWrap, { paddingHorizontal: theme.spacing.md, marginVertical: theme.spacing.xs }]}
        testID={id}
      >
        <View
          style={[styles.systemBubble, { backgroundColor: surface, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`System message: ${message.body}`}
        >
          <Icon source="information-outline" size={14} color={onSurface} />
          <Text variant="labelSmall" style={{ color: onSurface, marginLeft: 6, flex: 1 }} selectable>
            {message.body}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        styles.wrap,
        {
          alignItems: isPatient ? 'flex-end' : 'flex-start',
          paddingHorizontal: theme.spacing.md,
          marginTop: groupedWithPrevious ? 2 : theme.spacing.sm,
        },
      ]}
      testID={id}
    >
      {/* Sender is stated in text, not implied by colour. */}
      {!groupedWithPrevious ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
          {senderLabel}
        </Text>
      ) : null}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: surface,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.sm,
            maxWidth: `${health.layout.chatMaxWidthPercent}%`,
            borderWidth: message.status === 'failed' ? 1 : 0,
            borderColor: health.colors.urgentAccent,
          },
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${senderLabel}, ${time}. ${message.body ?? ''} ${
          message.attachments?.length ? `${message.attachments.length} attachment` : ''
        } ${isPatient ? statusMeta.label : ''}`.trim()}
      >
        {message.body ? (
          // Selectable so a patient can copy dosing instructions accurately.
          <Text variant="bodyMedium" style={{ color: onSurface }} selectable>
            {message.body}
          </Text>
        ) : null}

        {message.attachments?.length ? (
          <View style={{ gap: theme.spacing.xs, marginTop: message.body ? theme.spacing.xs : 0 }}>
            {message.attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onPress={onAttachmentPress}
                testID={childTestID(id, `attachment-${attachment.id}`)}
              />
            ))}
          </View>
        ) : null}

        {message.translatedFrom ? (
          <Text
            variant="labelSmall"
            onPress={onTranslate ? () => onTranslate(message) : undefined}
            accessibilityRole={onTranslate ? 'button' : 'text'}
            style={{ color: onSurface, opacity: 0.75, marginTop: 4 }}
          >
            Translated from {message.translatedFrom} · Show original
          </Text>
        ) : null}
      </View>

      <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {time}
        </Text>
        {isPatient ? (
          <>
            {message.status === 'sending' ? <ActivityIndicator size={10} /> : null}
            {statusMeta.icon ? (
              <Icon
                source={statusMeta.icon}
                size={12}
                color={message.status === 'failed' ? health.colors.urgentAccent : theme.colors.onSurfaceVariant}
              />
            ) : null}
            <Text
              variant="labelSmall"
              style={{ color: message.status === 'failed' ? health.colors.urgentAccent : theme.colors.onSurfaceVariant }}
            >
              {statusMeta.label}
            </Text>
            {message.status === 'failed' && onRetry ? (
              <Text
                variant="labelSmall"
                onPress={() => onRetry(message)}
                accessibilityRole="button"
                accessibilityLabel="Retry sending this message"
                style={{ color: theme.colors.primary }}
                testID={childTestID(id, 'retry')}
              >
                Retry
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
    </Animated.View>
  );
});

export interface SecureMessagingBannerProps {
  /** "Your care team usually replies within 2 business days." */
  responseTimeNote: string;
  emergencyNumber?: string;
  outOfOffice?: string;
  testID?: string;
}

/**
 * Expectation-setting for the thread.
 *
 * Rendered once at the top of the conversation, never repeated on each bubble.
 * Secure messaging is nonurgent by design, and saying so is the difference
 * between a delayed reply and a dangerous delay.
 */
export const SecureMessagingBanner = ({
  responseTimeNote,
  emergencyNumber = '112',
  outOfOffice,
  testID,
}: SecureMessagingBannerProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: health.colors.surfaceCalm, padding: theme.spacing.sm, gap: 2 },
      ]}
      accessible
      accessibilityRole="summary"
      testID={testID}
    >
      <View style={[styles.row, { gap: 4 }]}>
        <Icon source="lock-outline" size={13} color={health.colors.onSurfaceCalm} />
        <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm, flex: 1 }}>
          Messages are secure and for nonurgent questions. {responseTimeNote}
        </Text>
      </View>
      {outOfOffice ? (
        <Text variant="labelSmall" style={{ color: health.colors.statusRequiresAction }}>
          {outOfOffice}
        </Text>
      ) : null}
      <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm }}>
        If this is an emergency, call {emergencyNumber} or your local emergency number.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  bubble: {},
  systemWrap: { alignItems: 'center' },
  systemBubble: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  attachment: { borderWidth: 1, minWidth: 180 },
  banner: { width: '100%' },
  flex: { flex: 1 },
});
