/**
 * USAGE — ReactionBar
 *
 * The live example runs a real optimistic cycle: the count changes immediately,
 * the mutation is attempted, and a failure rolls the count back and offers a
 * retry rather than silently reverting.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ReactionDefinition, ReactionState } from '../types/domain';
import { ReactionBar } from './ReactionBar';
import sample from './ReactionBar.sample.json';

const data = loadSample<{ reactions: ReactionDefinition[]; states: Record<string, ReactionState> }>(sample);

export const ReactionBarUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [live, setLive] = useState<ReactionState>(data.states.unreacted!);
  const [syncing, setSyncing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failNext, setFailNext] = useState(false);

  /** Optimistic apply, rollback on failure. */
  const react = useCallback(
    async (reaction?: string) => {
      const previous = live;
      const counts = { ...live.counts };

      if (live.userReaction) counts[live.userReaction] = Math.max(0, (counts[live.userReaction] ?? 1) - 1);
      if (reaction) counts[reaction] = (counts[reaction] ?? 0) + 1;

      setLive({ ...live, counts, userReaction: reaction });
      setFailed(false);
      setSyncing(true);

      await new Promise((resolve) => setTimeout(resolve, 700));
      setSyncing(false);

      if (failNext) {
        setLive(previous);
        setFailed(true);
        return;
      }
      toast.show(reaction ? `Reacted: ${data.reactions.find((r) => r.id === reaction)?.label}` : 'Reaction removed');
    },
    [failNext, live, toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Make the next reaction fail
        </Text>
        <Switch value={failNext} onValueChange={setFailNext} accessibilityLabel="Simulate a failed reaction" />
      </View>

      <AppCard variant="outlined" title="Live — tap, or long-press for the picker">
        <ReactionBar
          state={live}
          reactions={data.reactions}
          syncing={syncing}
          failed={failed}
          onReactionChange={(next) => void react(next)}
          onRetry={() => void react(live.userReaction ?? 'like')}
          onComment={() => toast.show('Opening comments')}
          onShare={() => toast.show('Opening the share sheet')}
          onSave={(next) => setLive((prev) => ({ ...prev, saved: next }))}
          onViewReactions={() => toast.show('Who reacted')}
          testID="reactions-live"
        />
      </AppCard>

      <Divider />

      {Object.entries(data.states).map(([key, state]) => (
        <View key={key} style={{ gap: 4 }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {key}
          </Text>
          <ReactionBar
            state={state}
            reactions={data.reactions}
            disabledReason={key === 'restricted' ? 'Reactions are turned off for this post' : undefined}
            onReactionChange={() => toast.show('Reaction')}
            onComment={() => toast.show('Comments')}
            onShare={() => toast.show('Share')}
            onSave={() => toast.show('Saved')}
            testID={`reactions-${key}`}
          />
        </View>
      ))}

      <Text variant="labelLarge">With labels, and as a vertical rail (video overlay)</Text>
      <ReactionBar state={data.states.reacted!} reactions={data.reactions} showLabels onComment={() => {}} onShare={() => {}} />
      <View style={{ alignSelf: 'flex-start' }}>
        <ReactionBar
          state={data.states.largeCounts!}
          reactions={data.reactions}
          orientation="vertical"
          onComment={() => {}}
          onShare={() => {}}
          onSave={() => {}}
          testID="reactions-rail"
        />
      </View>
    </ScrollView>
  );
};
