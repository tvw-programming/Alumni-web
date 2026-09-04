import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  DriverCardUsage,
  FareEstimateCardUsage,
  LocationSearchSheetUsage,
  MapMarkerCalloutUsage,
  OTPDisplayCardUsage,
  RideHistoryListItemUsage,
  RideStatusBottomSheetUsage,
  RideTypeSelectorUsage,
  SavedPlaceItemUsage,
  SOSButtonUsage,
  ScheduleRideSheetUsage,
  TipSelectorUsage,
  TripSummaryCardUsage,
} from '@ui/transportation';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'location', title: 'LocationSearchSheet', description: '"Where to?" first; textual search survives a map outage', Component: LocationSearchSheetUsage },
  { key: 'ridetype', title: 'RideTypeSelector', description: 'Price and ETA always shown together, unavailable stays visible', Component: RideTypeSelectorUsage },
  { key: 'fare', title: 'FareEstimateCard', description: 'Never labelled final while route, tolls or demand can still change it', Component: FareEstimateCardUsage },
  { key: 'driver', title: 'DriverCard', description: 'Vehicle plate, make, model and colour; masked contact', Component: DriverCardUsage },
  { key: 'status', title: 'RideStatusBottomSheet', description: 'Status from a real state machine, not a moving marker', Component: RideStatusBottomSheetUsage },
  { key: 'map', title: 'MapMarkerCallout', description: 'Map paired with a full text-list alternative', Component: MapMarkerCalloutUsage },
  { key: 'otp', title: 'OTPDisplayCard', description: 'Reveal-on-tap pickup code, never auto-announced', Component: OTPDisplayCardUsage },
  { key: 'sos', title: 'SOSButton', description: 'A Safety Centre with a real confirmation before any call', Component: SOSButtonUsage },
  { key: 'trip', title: 'TripSummaryCard', description: 'Receipt, dispute and lost-item bound to the exact trip id', Component: TripSummaryCardUsage },
  { key: 'saved', title: 'SavedPlaceItem', description: 'Whole row selects; delete always confirms in place', Component: SavedPlaceItemUsage },
  { key: 'schedule', title: 'ScheduleRideSheet', description: 'States plainly whether a vehicle is guaranteed or just requested', Component: ScheduleRideSheetUsage },
  { key: 'tip', title: 'TipSelector', description: '"No tip" carries the same visual weight as every preset', Component: TipSelectorUsage },
  { key: 'history', title: 'RideHistoryListItem', description: 'Status by icon and word, never a coloured line alone', Component: RideHistoryListItemUsage },
];

export const TransportationScreen = () => {
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
        title="Transportation & ride-hailing library"
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
            testID={`transportation-entry-${item.key}`}
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
