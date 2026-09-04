import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AgentContactCardUsage,
  AmenityGridUsage,
  ComparePropertiesTableUsage,
  DocumentChecklistItemUsage,
  EMICalculatorCardUsage,
  LocalityInsightsCardUsage,
  PropertyCardUsage,
  PropertyFilterSheetUsage,
  PropertyMediaUsage,
  PropertyStatusChipUsage,
  SavedSearchAndTrendUsage,
  SiteVisitSchedulerSheetUsage,
} from '@ui/realestate';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'property-card', title: 'PropertyCard', description: 'Sold/unavailable listings stay visible with an honest status overlay', Component: PropertyCardUsage },
  { key: 'filter-sheet', title: 'PropertyFilterSheet', description: 'Live result count near Apply, invalid price range flagged as text', Component: PropertyFilterSheetUsage },
  { key: 'amenity-grid', title: 'AmenityGrid', description: 'Included is the default; paid and unavailable are labelled, not colour-only', Component: AmenityGridUsage },
  { key: 'media', title: 'FloorPlanViewer + ImageGalleryGrid', description: 'Every floor ships a plain-text room list alongside the drawing', Component: PropertyMediaUsage },
  { key: 'agent', title: 'AgentContactCard', description: 'Call and WhatsApp stay visually distinct; numbers stay masked', Component: AgentContactCardUsage },
  { key: 'emi', title: 'EMICalculatorCard', description: 'Never implies approval; every slider has a numeric entry alternative', Component: EMICalculatorCardUsage },
  { key: 'locality', title: 'LocalityInsightsCard', description: 'Every insight states its distance, source and freshness', Component: LocalityInsightsCardUsage },
  { key: 'visit', title: 'SiteVisitSchedulerSheet', description: '"Pending confirmation" and "Confirmed" are always distinct states', Component: SiteVisitSchedulerSheetUsage },
  { key: 'compare', title: 'ComparePropertiesTable', description: 'Missing data reads "Not provided," never "No"', Component: ComparePropertiesTableUsage },
  { key: 'saved-search', title: 'SavedSearchItem + PriceTrendChart', description: 'A price trend is always historical data, never investment advice', Component: SavedSearchAndTrendUsage },
  { key: 'documents', title: 'DocumentChecklistItem', description: '"Uploaded" and "Verified" are always visually and textually distinct', Component: DocumentChecklistItemUsage },
  { key: 'status-chip', title: 'PropertyStatusChip', description: 'Sold/rented use the same muted grey as every other status', Component: PropertyStatusChipUsage },
];

export const RealEstateScreen = () => {
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
        title="Real estate & PropTech library"
        description="12 components, each with a sample JSON payload and a compiling usage example."
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
            testID={`realestate-entry-${item.key}`}
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
