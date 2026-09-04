/**
 * USAGE — MessageBubble
 *
 * A group thread with every delivery state. Toggle read receipts off and watch
 * the read ticks fall back to "Delivered" — the app must not claim knowledge the
 * recipient chose not to share.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Message } from '../types/domain';
import { TypingIndicator } from '../MessageStatus/MessageStatusIcon';
import { MessageBubble } from './MessageBubble';
import sample from './MessageBubble.sample.json';

const { messages: initial } = loadSample<{ messages: Message[] }>(sample);

export const MessageBubbleUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [messages, setMessages] = useState<Message[]>(initial);
  const [receiptsOff, setReceiptsOff] = useState(false);

  const retry = useCallback(
    (message: Message) => {
      setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, status: 'sending' } : item)));
      setTimeout(() => {
        setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, status: 'sent' } : item)));
        toast.success('Message sent');
      }, 800);
    },
    [toast],
  );

  const react = useCallback((message: Message, emoji: string) => {
    setMessages((prev) =>
      prev.map((item) => {
        if (item.id !== message.id) return item;
        const reactions = (item.reactions ?? []).map((reaction) =>
          reaction.emoji === emoji
            ? {
                ...reaction,
                count: reaction.count + (reaction.reactedByMe ? -1 : 1),
                reactedByMe: !reaction.reactedByMe,
              }
            : reaction,
        );
        return { ...item, reactions: reactions.filter((reaction) => reaction.count > 0) };
      }),
    );
  }, []);

  return (
    <View style={styles.flex}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Recipients have read receipts off
          </Text>
          <Switch value={receiptsOff} onValueChange={setReceiptsOff} accessibilityLabel="Read receipts disabled" />
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Long-press a bubble for actions — the same actions are on the ⋮ button, because a hidden gesture is not an
          affordance for keyboard or switch users.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.md }}>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            index={index}
            entering="slideUp"
            showSender
            groupedWithPrevious={index > 0 && messages[index - 1]?.sender.id === message.sender.id && !message.system}
            readReceiptsDisabled={receiptsOff}
            onRetry={retry}
            onReact={react}
            onPressReply={(reference) => toast.show(`Jumping to ${reference.authorName}'s message`)}
            onPressAttachment={(attachment) => toast.show(`Opening ${attachment.name}`)}
            onPlayVoice={() => toast.show('Playing voice message')}
            actions={[
              { key: 'reply', label: 'Reply', icon: 'reply', onPress: () => toast.show('Replying') },
              { key: 'react', label: 'React', icon: 'emoticon-outline', onPress: () => react(message, '👍') },
              { key: 'copy', label: 'Copy text', icon: 'content-copy', onPress: () => toast.success('Copied') },
              { key: 'forward', label: 'Forward', icon: 'share', onPress: () => toast.show('Forwarding') },
              { key: 'delete', label: 'Delete', icon: 'delete-outline', destructive: true, onPress: () => toast.show('Deleting') },
            ]}
          />
        ))}

        <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm }}>
          <TypingIndicator
            typing={{ users: ['Priya', 'Kabir'], updatedAt: new Date().toISOString() }}
            inBubble
            testID="thread-typing"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
