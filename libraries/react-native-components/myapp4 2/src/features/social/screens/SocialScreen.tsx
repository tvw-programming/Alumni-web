import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  ChatInputBarUsage,
  CommentsUsage,
  ConversationListItemUsage,
  FollowButtonUsage,
  MediaGridViewerUsage,
  MentionTextInputUsage,
  MessageBubbleUsage,
  MessageStatusUsage,
  PostCardUsage,
  ReactionBarUsage,
  ReportBlockSheetUsage,
  StoriesUsage,
  UserProfileHeaderUsage,
} from '@ui/social';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'post', title: 'PostCard', description: 'Text, carousel, video, link, poll, quote, sponsored, moderated', Component: PostCardUsage },
  { key: 'reactions', title: 'ReactionBar', description: 'Optimistic reactions with rollback, hidden counts, picker', Component: ReactionBarUsage },
  { key: 'comments', title: 'CommentItem + CommentInputBar', description: 'Optimistic insert, failed retry, nesting stated in text', Component: CommentsUsage },
  { key: 'stories', title: 'StoryRing + Tray + Viewer', description: 'Pausable playback, upload states, button equivalents', Component: StoriesUsage },
  { key: 'profile', title: 'UserProfileHeader', description: 'Private, blocked, own profile, long names, labelled counts', Component: UserProfileHeaderUsage },
  { key: 'follow', title: 'FollowButton', description: 'Requested vs following, announced transitions, rollback', Component: FollowButtonUsage },
  { key: 'messages', title: 'MessageBubble', description: 'Every delivery state, replies, voice, deletions, retry', Component: MessageBubbleUsage },
  { key: 'composer', title: 'ChatInputBar', description: 'Tap-to-record voice, slow mode, blocked files, offline', Component: ChatInputBarUsage },
  { key: 'conversations', title: 'ConversationListItem', description: 'Typing beats draft beats last message; typed previews', Component: ConversationListItemUsage },
  { key: 'status', title: 'TypingIndicator + MessageStatusIcon', description: 'Receipt privacy, stale-indicator timeout, reduced motion', Component: MessageStatusUsage },
  { key: 'mentions', title: 'MentionTextInput', description: 'Stale-request cancellation, privacy warnings, stable ids', Component: MentionTextInputUsage },
  { key: 'media', title: 'MediaGridViewer', description: 'Fixed ratios, content warnings, announced position', Component: MediaGridViewerUsage },
  { key: 'moderation', title: 'ReportBlockSheet', description: 'Report / block / mute / restrict, safety escalation', Component: ReportBlockSheetUsage },
];

export const SocialScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((item) => item.key === active), [active]);

  if (entry) {
    const { Component } = entry;
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { padding: theme.spacing.md, backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.flex}>
            {entry.title}
          </Text>
          <Text
            variant="labelLarge"
            onPress={() => setActive(null)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Back
          </Text>
        </View>
        <Component />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <StateView
        preset="success"
        compact
        title="Social & messaging library"
        description="13 components, each with a sample JSON payload and a compiling usage example."
      />

      <AppCard variant="outlined" padded={false}>
        {ENTRIES.map((item, index) => (
          <List.Item
            key={item.key}
            title={item.title}
            description={item.description}
            descriptionNumberOfLines={2}
            onPress={() => setActive(item.key)}
            left={() => (
              <View style={[styles.index, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            )}
            right={() => <List.Icon icon="chevron-right" />}
            testID={`social-entry-${item.key}`}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
