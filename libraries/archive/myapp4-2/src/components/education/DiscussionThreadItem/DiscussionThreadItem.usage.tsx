/**
 * USAGE — DiscussionThreadItem
 *
 * The empty state says "Be the first to ask a question" rather than "No one has
 * answered" — blame-free copy matters most in the places learners feel least
 * confident.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { DiscussionThread } from '../types/domain';
import { DiscussionThreadItem } from './DiscussionThreadItem';
import sample from './DiscussionThreadItem.sample.json';

const { threads } = loadSample<{ threads: DiscussionThread[] }>(sample);

type Filter = 'all' | 'unread' | 'unanswered' | 'instructor';

export const DiscussionThreadItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [filter, setFilter] = useState<Filter>('all');
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(false);

  const visible = useMemo(() => {
    switch (filter) {
      case 'unread':
        return threads.filter((thread) => thread.unread);
      case 'unanswered':
        return threads.filter((thread) => thread.replyCount === 0 && thread.status === 'open');
      case 'instructor':
        return threads.filter((thread) => thread.hasInstructorReply || thread.author.role !== 'learner');
      default:
        return threads;
    }
  }, [filter]);

  if (empty) {
    return (
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <StateView
          preset="empty"
          title="No discussions yet"
          description="Be the first to ask a question — someone else is probably wondering the same thing."
          primaryAction={{ label: 'Ask a question', onPress: () => toast.show('Opening the composer') }}
          secondaryAction={{ label: 'Show demo threads', onPress: () => setEmpty(false) }}
          testID="threads-empty"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <AppButton variant="primary" fullWidth icon="plus" onPress={() => toast.show('Opening the composer')}>
          Ask a question
        </AppButton>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {(['all', 'unread', 'unanswered', 'instructor'] as Filter[]).map((option) => (
            <Chip
              key={option}
              selected={filter === option}
              showSelectedCheck={filter === option}
              onPress={() => setFilter(option)}
            >
              {option === 'all'
                ? 'All'
                : option === 'unread'
                  ? 'Unread'
                  : option === 'unanswered'
                    ? 'Unanswered'
                    : 'Instructor'}
            </Chip>
          ))}
        </View>

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          The removed post and the deleted author are both attributed honestly — content that silently disappears makes
          moderation look arbitrary.
        </Text>
      </View>

      <AppCard variant="outlined" padded={false} containerStyle={{ marginHorizontal: theme.spacing.md }}>
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <DiscussionThreadItem key={index} thread={threads[0]!} loading />
            ))
          : visible.map((thread, index) => (
              <DiscussionThreadItem
                key={thread.id}
                thread={thread}
                index={index}
                entering="slideUp"
                divider={index < visible.length - 1}
                pendingReply={thread.id === 't-3'}
                onPress={(item) => toast.show(`Opening "${item.title.slice(0, 28)}…"`)}
                onReply={() => toast.show('Opening the reply box')}
                onReport={() => toast.show('Thanks — a moderator will review this')}
              />
            ))}
      </AppCard>

      <View style={{ padding: theme.spacing.md, flexDirection: 'row', gap: theme.spacing.md }}>
        <Text
          variant="labelSmall"
          onPress={() => setEmpty(true)}
          accessibilityRole="button"
          style={{ color: theme.colors.primary }}
        >
          Show empty state
        </Text>
        <Text
          variant="labelSmall"
          onPress={() => setLoading((prev) => !prev)}
          accessibilityRole="button"
          style={{ color: theme.colors.primary }}
        >
          Toggle loading
        </Text>
      </View>
    </ScrollView>
  );
};
