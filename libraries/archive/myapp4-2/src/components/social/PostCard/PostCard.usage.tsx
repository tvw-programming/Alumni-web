/**
 * USAGE — PostCard
 *
 * A working feed. Every post kind is here, including the two moderated
 * tombstones and the content-warning case — the states that usually get skipped
 * in a component demo and then ship broken.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Post, ReactionState } from '../types/domain';
import { PostCard } from './PostCard';
import sample from './PostCard.sample.json';

const data = loadSample<{ posts: Post[]; reactions: Record<string, ReactionState> }>(sample);

export const PostCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [reactions, setReactions] = useState(data.reactions);
  const [votes, setVotes] = useState<Record<string, string>>({});

  /** Reaction mutation lives in the screen; the card only reports intent. */
  const react = useCallback((postId: string, reaction?: string) => {
    setReactions((prev) => {
      const state = prev[postId];
      if (!state) return prev;
      const counts = { ...state.counts };
      if (state.userReaction) counts[state.userReaction] = Math.max(0, (counts[state.userReaction] ?? 1) - 1);
      if (reaction) counts[reaction] = (counts[reaction] ?? 0) + 1;
      return { ...prev, [postId]: { ...state, counts, userReaction: reaction } };
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={density}
          onValueChange={(next) => setDensity(next as 'comfortable' | 'compact')}
          density="small"
          buttons={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Media URIs are unreachable, so each tile shows its alt text. Video never autoplays. The storm photo is behind a
          content warning until you choose to reveal it.
        </Text>
      </View>

      {data.posts.map((post, index) => (
        <PostCard
          key={post.id}
          post={{
            ...post,
            poll: post.poll ? { ...post.poll, votedOptionId: votes[post.id] ?? post.poll.votedOptionId } : undefined,
          }}
          reactions={reactions[post.id]}
          density={density}
          index={index}
          entering="slideUp"
          onPressAuthor={(item) => toast.show(`Opening ${item.author.displayName}'s profile`)}
          onReact={react}
          onComment={() => toast.show('Opening comments')}
          onShare={() => toast.show('Opening the share sheet')}
          onSave={(postId, next) =>
            setReactions((prev) => ({ ...prev, [postId]: { ...prev[postId]!, saved: next } }))
          }
          onOpenMedia={(item, mediaIndex) => toast.show(`Media ${mediaIndex + 1} of ${item.media?.length}`)}
          onOpenLink={(url) => toast.show(`Opening ${url.slice(0, 36)}…`)}
          onVote={(postId, optionId) => {
            setVotes((prev) => ({ ...prev, [postId]: optionId }));
            toast.success('Vote recorded');
          }}
          overflowActions={[
            { key: 'save', label: 'Save post', icon: 'bookmark-outline', onPress: () => toast.show('Saved') },
            { key: 'mute', label: `Mute ${post.author.displayName}`, icon: 'volume-off', onPress: () => toast.show('Muted') },
            { key: 'report', label: 'Report post', icon: 'flag-outline', destructive: true, onPress: () => toast.show('Opening report') },
          ]}
        />
      ))}

      <View style={{ padding: theme.spacing.md }}>
        <Text variant="labelLarge">Loading</Text>
      </View>
      <PostCard post={data.posts[0]!} loading onPressAuthor={() => {}} testID="post-loading" />
    </ScrollView>
  );
};
