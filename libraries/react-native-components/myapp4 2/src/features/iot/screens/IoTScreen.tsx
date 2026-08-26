import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AutomationRuleCardUsage,
  ColorPickerUsage,
  DeviceCardUsage,
  DeviceHealthUsage,
  DevicePairingWizardUsage,
  DeviceToggleTileUsage,
  FirmwareUpdateCardUsage,
  RoomTabsUsage,
  SceneCardUsage,
  ScheduleTimerRowUsage,
  SensorReadingCardUsage,
  SliderControlUsage,
  ThermostatDialUsage,
} from '@ui/iot';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'device-card', title: 'DeviceCard', description: 'Controls driven by capabilities; "offline" never reads as "off"', Component: DeviceCardUsage },
  { key: 'toggle-tile', title: 'DeviceToggleTile', description: 'pending/offline/error stay distinct from on/off', Component: DeviceToggleTileUsage },
  { key: 'slider', title: 'SliderControl', description: 'Plus/minus buttons alongside the drag gesture', Component: SliderControlUsage },
  { key: 'thermostat', title: 'ThermostatDial', description: 'Current vs. target temperature always both on screen', Component: ThermostatDialUsage },
  { key: 'color', title: 'ColorPickerWheel + ColorPresetChips', description: 'Selected hue always announced as text', Component: ColorPickerUsage },
  { key: 'rooms', title: 'RoomTabs', description: 'Alert counts pair a Badge with a number, never colour alone', Component: RoomTabsUsage },
  { key: 'scene', title: 'SceneCard', description: 'Partial scene execution never reports as "completed"', Component: SceneCardUsage },
  { key: 'automation', title: 'AutomationRuleCard', description: 'Trigger/condition/action always render as plain language', Component: AutomationRuleCardUsage },
  { key: 'pairing', title: 'DevicePairingWizard', description: 'Every failure stays recoverable; manual code is a real fallback', Component: DevicePairingWizardUsage },
  { key: 'sensor', title: 'SensorReadingCard', description: '"Critical" always ships with a threshold explanation', Component: SensorReadingCardUsage },
  { key: 'health', title: 'BatteryIndicator + SignalStrengthIcon', description: 'Every status pairs an icon and a word with its colour', Component: DeviceHealthUsage },
  { key: 'firmware', title: 'FirmwareUpdateCard', description: '100% download is "Installing," never "Success"', Component: FirmwareUpdateCardUsage },
  { key: 'schedule', title: 'ScheduleTimerRow', description: 'Accessible label combines schedule name and live state', Component: ScheduleTimerRowUsage },
];

export const IoTScreen = () => {
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
        title="IoT & smart home / wearables library"
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
            testID={`iot-entry-${item.key}`}
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
