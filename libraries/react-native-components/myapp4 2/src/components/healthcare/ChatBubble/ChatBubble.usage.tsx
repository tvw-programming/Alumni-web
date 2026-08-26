/**
 * USAGE — ChatBubble + SecureMessagingBanner
 *
 * A full secure-messaging thread, including the states that usually get skipped:
 * an upload in progress, a blocked file type, and a failed send with retry.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ChatMessage } from '../types/domain';
import { ChatBubble, SecureMessagingBanner } from './ChatBubble';
import sample from './ChatBubble.sample.json';

const data = loadSample<{
  messages: ChatMessage[];
  responseTimeNote: string;
  outOfOffice: string;
}>(sample);

export const ChatBubbleUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>(data.messages);
  const [draft, setDraft] = useState('');

  const send = useCallback(async () => {
    const id = `msg-local-${Date.now()}`;
    const body = draft.trim();
    setDraft('');
    setMessages((prev) => [...prev, { id, sender: 'patient', body, createdAt: new Date().toISOString(), status: 'sending' }]);

    await new Promise((resolve) => setTimeout(resolve, 800));
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'sent' } : item)));
  }, [draft]);

  const retry = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, status: 'sending' } : item)));
      setTimeout(() => {
        setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, status: 'sent' } : item)));
        toast.success('Message sent');
      }, 800);
    },
    [toast],
  );

  /** Consecutive messages from the same sender drop the repeated label. */
  const rows = useMemo(
    () =>
      messages.map((message, index) => ({
        message,
        grouped: index > 0 && messages[index - 1]?.sender === message.sender && message.sender !== 'system',
      })),
    [messages],
  );

  return (
    <View style={styles.flex}>
      <SecureMessagingBanner
        responseTimeNote={data.responseTimeNote}
        outOfOffice={data.outOfOffice}
        emergencyNumber="112"
        testID="chat-banner"
      />

      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.sm }}>
        {rows.map(({ message, grouped }, index) => (
          <ChatBubble
            key={message.id}
            message={message}
            groupedWithPrevious={grouped}
            index={index}
            entering="slideUp"
            onRetry={retry}
            onAttachmentPress={(attachment) => toast.show(`Opening ${attachment.name}`)}
            onTranslate={() => toast.show('Showing the original text')}
          />
        ))}
      </ScrollView>

      <View style={[styles.composer, { padding: theme.spacing.md, gap: theme.spacing.sm, borderTopColor: theme.colors.outlineVariant }]}>
        <View style={styles.flex}>
          <AppTextInput
            label="Message your care team"
            value={draft}
            onChangeText={setDraft}
            multiline
            numberOfLines={2}
            maxLength={2000}
            showCounter
            testID="chat-composer"
          />
        </View>
        <AppButton
          variant="primary"
          size="sm"
          icon="send"
          disabled={draft.trim().length === 0}
          debounceMs={600}
          onPress={() => void send()}
          containerStyle={{ marginTop: 6 }}
          accessibilityLabel="Send message"
        >
          Send
        </AppButton>
      </View>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.md, paddingTop: 0 }}>
        Clinical records may carry retention, audit and immutability rules — none of which belong inside this chat UI.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth },
});
