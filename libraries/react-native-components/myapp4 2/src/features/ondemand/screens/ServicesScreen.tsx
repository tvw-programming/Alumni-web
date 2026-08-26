import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AddOnServiceListUsage,
  AgentInfoCardUsage,
  BookingSummaryCardUsage,
  CancelReasonSheetUsage,
  LiveTrackingCardUsage,
  OrderStatusTimelineUsage,
  PriceBreakdownSheetUsage,
  RatingFeedbackDialogUsage,
  ServiceCategoryTileUsage,
  ServiceProviderCardUsage,
  SlotBookingCalendarUsage,
} from '@ui/ondemand';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'category', title: 'ServiceCategoryTile', description: 'Grid, image, compact variants; unavailable stays visible', Component: ServiceCategoryTileUsage },
  { key: 'provider', title: 'ServiceProviderCard', description: 'Verified explains itself, sample-size honest ratings', Component: ServiceProviderCardUsage },
  { key: 'slots', title: 'SlotBookingCalendar', description: 'Timezone always stated, held slots shown not hidden', Component: SlotBookingCalendarUsage },
  { key: 'addons', title: 'AddOnServiceList', description: 'Full-row targets, required/disabled stay listed with reasons', Component: AddOnServiceListUsage },
  { key: 'price', title: 'PriceBreakdownSheet', description: 'Inline or sheet, expandable fees, price-changed banner', Component: PriceBreakdownSheetUsage },
  { key: 'summary', title: 'BookingSummaryCard', description: 'Who/when/where/how much, each with its own Change action', Component: BookingSummaryCardUsage },
  { key: 'timeline', title: 'OrderStatusTimeline', description: 'One dominant current step, stale ETA becomes honest text', Component: OrderStatusTimelineUsage },
  { key: 'tracking', title: 'LiveTrackingCard', description: 'Map paired with a text sentence, ends with no location left', Component: LiveTrackingCardUsage },
  { key: 'agent', title: 'AgentInfoCard', description: 'Reveal-on-tap OTP, masked contact, safety action', Component: AgentInfoCardUsage },
  { key: 'rating', title: 'RatingFeedbackDialog', description: 'Stars alone are a complete answer; tags and note optional', Component: RatingFeedbackDialogUsage },
  { key: 'cancel', title: 'CancelReasonSheet', description: '"Keep booking" weighted equally with the cancel action', Component: CancelReasonSheetUsage },
];

export const ServicesScreen = () => {
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
        title="Delivery & home service library"
        description="11 components, each with a sample JSON payload and a compiling usage example."
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
            testID={`services-entry-${item.key}`}
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
