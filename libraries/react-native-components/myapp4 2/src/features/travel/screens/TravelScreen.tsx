import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AmenityIconGridUsage,
  BookingTicketCardUsage,
  CancellationPolicyCardUsage,
  FareBreakdownAccordionUsage,
  FlightResultCardUsage,
  GuestRoomSelectorUsage,
  HotelCardUsage,
  ItineraryTimelineUsage,
  PriceCalendarStripUsage,
  ReviewSummaryCardUsage,
  RoomTypeCardUsage,
  SearchWidgetUsage,
  TravellerDetailsFormUsage,
} from '@ui/travel';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'search', title: 'SearchWidget', description: 'From/to, dates, travelers — query state kept separate from search', Component: SearchWidgetUsage },
  { key: 'flight', title: 'FlightResultCard', description: 'Stops, self-transfer and airport-change warnings on the card', Component: FlightResultCardUsage },
  { key: 'hotel', title: 'HotelCard', description: 'Free cancellation always carries its deadline', Component: HotelCardUsage },
  { key: 'room', title: 'RoomTypeCard', description: 'Room type and rate plan shown as one selectable unit', Component: RoomTypeCardUsage },
  { key: 'guests', title: 'GuestRoomSelector', description: 'Grouped steppers; never silently adds a room', Component: GuestRoomSelectorUsage },
  { key: 'fare', title: 'FareBreakdownAccordion', description: 'Every fee explainable on tap, nothing concealed until payment', Component: FareBreakdownAccordionUsage },
  { key: 'amenities', title: 'AmenityIconGrid', description: 'Icon-plus-label grid with a full text-list alternative', Component: AmenityIconGridUsage },
  { key: 'itinerary', title: 'ItineraryTimeline', description: 'Grouped by day, timezone always stated next to local time', Component: ItineraryTimelineUsage },
  { key: 'travellers', title: 'TravellerDetailsForm', description: 'Repeatable blocks; "same as booker" is an explicit checkbox', Component: TravellerDetailsFormUsage },
  { key: 'ticket', title: 'BookingTicketCard', description: 'Confirmation code stays legible even when the barcode can\'t render', Component: BookingTicketCardUsage },
  { key: 'calendar', title: 'PriceCalendarStrip', description: 'Cheapest-date discovery; trend, never a price guarantee', Component: PriceCalendarStripUsage },
  { key: 'cancellation', title: 'CancellationPolicyCard', description: 'Deadline and refund consequence always shown together', Component: CancellationPolicyCardUsage },
  { key: 'reviews', title: 'ReviewSummaryCard', description: 'Category scores with numeric labels; flags low sample size', Component: ReviewSummaryCardUsage },
];

export const TravelScreen = () => {
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
        title="Travel, hospitality & booking library"
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
            testID={`travel-entry-${item.key}`}
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
