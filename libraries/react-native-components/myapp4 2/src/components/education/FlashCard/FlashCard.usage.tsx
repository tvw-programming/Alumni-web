/**
 * USAGE — FlashCard
 *
 * A working review session. The recall response is handed to a stub scheduler
 * that decides the next interval — the card itself has no idea what "Good" means
 * for scheduling, which is the separation the spec asks for.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { FlashCardData, RecallResponse } from '../types/domain';
import { FlashCard } from './FlashCard';
import sample from './FlashCard.sample.json';

const data = loadSample<{
  deck: { id: string; title: string; cards: FlashCardData[] };
  emptyDeck: { id: string; title: string; cards: FlashCardData[] };
  brokenCard: FlashCardData;
}>(sample);

/** Stand-in for a spaced-repetition engine. Lives outside the card by design. */
const nextIntervalDays = (response: RecallResponse): number =>
  ({ again: 0, hard: 1, good: 3, easy: 7 })[response];

export const FlashCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<Array<{ card: string; response: RecallResponse; days: number }>>([]);
  const [finished, setFinished] = useState(false);

  const cards = data.deck.cards;
  const card = cards[index];

  const respond = useCallback(
    (item: FlashCardData, response: RecallResponse) => {
      const days = nextIntervalDays(response);
      setLog((prev) => [...prev, { card: item.front, response, days }]);
      toast.show(days === 0 ? 'You will see this again shortly' : `Next review in ${days} day${days === 1 ? '' : 's'}`);

      if (index >= cards.length - 1) setFinished(true);
      else setIndex((prev) => prev + 1);
    },
    [cards.length, index, toast],
  );

  if (finished) {
    return (
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <StateView
          preset="success"
          title="You've reviewed all cards for now"
          description="Come back later and the scheduler will bring the right cards forward."
          primaryAction={{
            label: 'Review again',
            onPress: () => {
              setIndex(0);
              setLog([]);
              setFinished(false);
            },
          }}
        />
        <AppCard variant="outlined" title="What the scheduler received">
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
            {JSON.stringify(log, null, 1)}
          </Text>
        </AppCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {data.deck.title} · "Show answer" is a real button, so the answer is never locked behind a gesture. With reduced
        motion enabled the flip becomes a cross-fade.
      </Text>

      {card ? (
        <FlashCard
          card={card}
          position={index + 1}
          total={cards.length}
          onRespond={respond}
          onNext={index < cards.length - 1 ? () => setIndex((prev) => prev + 1) : undefined}
          onPrevious={index > 0 ? () => setIndex((prev) => prev - 1) : undefined}
          onPlayAudio={(item) => toast.show(`Playing audio for "${item.back}"`)}
          testID="flashcard"
        />
      ) : null}

      <Text variant="labelLarge">Other states</Text>
      <FlashCard card={data.brokenCard} errorMessage="This card's content could not be loaded." testID="flashcard-error" />
      <FlashCard card={data.brokenCard} loading testID="flashcard-loading" />

      <StateView
        preset="empty"
        compact
        title="No cards due today"
        description="Your next review is scheduled for tomorrow."
        testID="flashcard-empty"
      />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
