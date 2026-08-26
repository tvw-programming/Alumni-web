import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AdvisoryAlertBannerUsage,
  BarcodeScannerOverlayUsage,
  CropCardUsage,
  FieldMapCardUsage,
  InputOrderCardUsage,
  InventoryStockRowUsage,
  MandiPriceListItemUsage,
  PODCaptureSheetUsage,
  RouteStopListItemUsage,
  ShipmentCardUsage,
  ShipmentStatusTimelineUsage,
  SoilHealthCardUsage,
  VehicleTrackingCardUsage,
  WarehouseSelectorUsage,
  WeatherForecastStripUsage,
} from '@ui/agritech';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'crop', title: 'CropCard', description: 'Farmer-confirmed vs. system-inferred stage always stay visibly distinct', Component: CropCardUsage },
  { key: 'weather', title: 'WeatherForecastStrip', description: 'A weather icon is never the only signal for storm or rain risk', Component: WeatherForecastStripUsage },
  { key: 'mandi', title: 'MandiPriceListItem', description: 'Price delta pairs an arrow icon and a word, never colour alone', Component: MandiPriceListItemUsage },
  { key: 'soil', title: 'SoilHealthCard', description: 'A progress bar’s midpoint is never implied to be universally optimal', Component: SoilHealthCardUsage },
  { key: 'advisory', title: 'AdvisoryAlertBanner', description: 'Severity and guidance always come from a validated advisory engine', Component: AdvisoryAlertBannerUsage },
  { key: 'field', title: 'FieldMapCard', description: 'A text summary always backs the map preview', Component: FieldMapCardUsage },
  { key: 'input', title: 'InputOrderCard', description: 'Dosage and safety detail stay on the product detail surface', Component: InputOrderCardUsage },
  { key: 'shipment', title: 'ShipmentCard', description: 'Carrier statuses always map to one shared semantic state', Component: ShipmentCardUsage },
  { key: 'timeline', title: 'ShipmentStatusTimeline', description: 'An event-based model preserves scan history exactly as it happened', Component: ShipmentStatusTimelineUsage },
  { key: 'vehicle', title: 'VehicleTrackingCard', description: 'Driver contact routes through a relay, never a raw phone number', Component: VehicleTrackingCardUsage },
  { key: 'inventory', title: 'InventoryStockRow', description: 'Low stock is never colour alone — quantity and reorder point show too', Component: InventoryStockRowUsage },
  { key: 'warehouse', title: 'WarehouseSelector', description: 'Selection stays fully controlled; nothing switches silently', Component: WarehouseSelectorUsage },
  { key: 'pod', title: 'PODCaptureSheet', description: 'Never marks delivery complete until the server accepts the evidence', Component: PODCaptureSheetUsage },
  { key: 'scanner', title: 'BarcodeScannerOverlay', description: 'A manual code path always sits next to the camera', Component: BarcodeScannerOverlayUsage },
  { key: 'stop', title: 'RouteStopListItem', description: 'Navigate, Start stop, and Add proof are real glove-sized buttons', Component: RouteStopListItemUsage },
];

export const AgriTechScreen = () => {
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
        title="AgriTech & logistics / supply chain library"
        description="15 components, each with a sample JSON payload and a compiling usage example."
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
            testID={`agritech-entry-${item.key}`}
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
