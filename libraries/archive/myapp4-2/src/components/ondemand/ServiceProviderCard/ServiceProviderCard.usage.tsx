/**
 * USAGE — ServiceProviderCard
 *
 * Tapping the verified badge opens what it actually covers rather than leaving
 * "verified" to imply a background check the platform may not run.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ServiceProvider } from '../types/domain';
import { ServiceProviderCard } from './ServiceProviderCard';
import sample from './ServiceProviderCard.sample.json';

const { providers } = loadSample<{ providers: ServiceProvider[] }>(sample);

export const ServiceProviderCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();
  const [favorites, setFavorites] = useState<string[]>(['sp-1']);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        The two-review case (Sunita) and the review-free case (Arjun, request-only) show why a rating needs its sample
        size stated, not averaged into a confident-looking score.
      </Text>

      {providers.map((provider, index) => (
        <ServiceProviderCard
          key={provider.id}
          provider={{ ...provider, favorited: favorites.includes(provider.id) }}
          index={index}
          entering="slideUp"
          onPress={(item) => toast.show(`Opening ${item.name}'s profile`)}
          onBook={(item) => toast.success(item.requestOnly ? `Request sent to ${item.name}` : `Opening booking for ${item.name}`)}
          onFavorite={(item, next) =>
            setFavorites((prev) => (next ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
          }
          onExplainVerification={(item) =>
            sheet.open(
              <Text variant="bodyMedium">{item.verificationScope}</Text>,
              { title: 'What verification means', variant: 'bottom' },
            )
          }
        />
      ))}

      <Text variant="labelLarge">Loading</Text>
      <ServiceProviderCard provider={providers[0]!} loading testID="provider-loading" />
    </ScrollView>
  );
};
