/**
 * USAGE — ConversationListItem
 *
 * Note the precedence in the preview line: typing beats draft beats last
 * message. And a photo or voice note keeps its *type* in the preview rather
 * than rendering an empty row.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Conversation } from '../types/domain';
import { ConversationListItem } from './ConversationListItem';
import sample from './ConversationListItem.sample.json';

const { conversations } = loadSample<{ conversations: Conversation[] }>(sample);

export const ConversationListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();

  const visible = useMemo(
    () => conversations.filter((item) => (showArchived ? true : !item.archived)),
    [showArchived],
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Include archived
          </Text>
          <Switch value={showArchived} onValueChange={setShowArchived} accessibilityLabel="Include archived" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Loading
          </Text>
          <Switch value={loading} onValueChange={setLoading} accessibilityLabel="Loading" />
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Swipe a row for quick actions — the same actions are on long-press, because swipe-only shortcuts are
          unreachable with a keyboard or switch device.
        </Text>
      </View>

      <AppCard variant="outlined" padded={false} containerStyle={{ marginHorizontal: theme.spacing.md }}>
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <ConversationListItem key={index} conversation={conversations[0]!} loading />
            ))
          : visible.map((conversation, index) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                index={index}
                entering="slideUp"
                selected={selectedId === conversation.id}
                onPress={(item) => {
                  setSelectedId(item.id);
                  toast.show(`Opening ${item.title.slice(0, 26)}…`);
                }}
                onLongPress={() => toast.show('Opening the conversation menu')}
                swipeActions={{
                  right: [
                    {
                      key: 'archive',
                      label: 'Archive',
                      icon: 'archive-outline',
                      intent: 'neutral',
                      onPress: () => toast.show('Archived'),
                    },
                  ],
                  left: [
                    {
                      key: 'mute',
                      label: conversation.muted ? 'Unmute' : 'Mute',
                      icon: conversation.muted ? 'bell-outline' : 'bell-off-outline',
                      intent: 'info',
                      onPress: () => toast.show(conversation.muted ? 'Unmuted' : 'Muted'),
                    },
                  ],
                }}
              />
            ))}
      </AppCard>
    </ScrollView>
  );
};
