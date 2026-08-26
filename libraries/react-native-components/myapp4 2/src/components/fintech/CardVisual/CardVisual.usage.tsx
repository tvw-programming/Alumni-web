/**
 * USAGE — CardVisual + CardDetailsPanel
 *
 * Shows the intended split: the card is decorative and always masked; revealing
 * credentials goes through `onReveal`, which must authenticate first.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { CardVisual, type CardVisualProps } from './CardVisual';
import { CardDetailsPanel, type RevealedCardDetails } from './CardDetailsPanel';
import sample from './CardVisual.sample.json';

type SampleCard = CardVisualProps & { id: string };
const { cards, revealedDetails } = loadSample<{ cards: SampleCard[]; revealedDetails: RevealedCardDetails }>(sample);

export const CardVisualUsage = () => {
  const theme = useAppTheme();
  const sheet = useSheet();
  const toast = useToast();
  const [frozenIds, setFrozenIds] = useState<string[]>([]);

  /** In production this awaits biometric/PIN auth before returning anything. */
  const reveal = useCallback(async (): Promise<RevealedCardDetails> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return revealedDetails;
  }, []);

  const openManage = useCallback(
    (card: SampleCard) => {
      sheet.open(
        <CardDetailsPanel
          status={frozenIds.includes(card.id) ? 'frozen' : card.status ?? 'active'}
          onReveal={reveal}
          onCopy={(field) => toast.success(`${field === 'pan' ? 'Card number' : 'CVV'} copied`)}
          onFreezeToggle={(frozen) =>
            setFrozenIds((prev) => (frozen ? [...prev, card.id] : prev.filter((id) => id !== card.id)))
          }
          onSetLimits={() => toast.show('Opening spending limits')}
          actions={[
            { key: 'wallet', label: 'Add to Apple Wallet', icon: 'wallet', onPress: () => toast.show('Adding to wallet') },
            { key: 'replace', label: 'Report lost or stolen', icon: 'alert', destructive: true, onPress: () => toast.error('Card reported') },
          ]}
          testID="card-details"
        />,
        { title: `Card •••• ${card.last4}`, variant: 'bottom', scrollable: true },
      );
    },
    [frozenIds, reveal, sheet, toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      {cards.map((card) => (
        <View key={card.id} style={{ gap: theme.spacing.sm }}>
          <Text variant="labelLarge">
            {card.variant} · {frozenIds.includes(card.id) ? 'frozen' : card.status}
          </Text>
          <CardVisual
            {...card}
            status={frozenIds.includes(card.id) ? 'frozen' : card.status}
            onPress={() => openManage(card)}
            testID={`card-${card.id}`}
          />
        </View>
      ))}

      <AppCard variant="outlined" title="Why the split?">
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          CardVisual has no prop that accepts a full card number. Revealing credentials is only possible through
          CardDetailsPanel, which requires an authenticating onReveal callback and auto-hides afterwards.
        </Text>
      </AppCard>
    </ScrollView>
  );
};
