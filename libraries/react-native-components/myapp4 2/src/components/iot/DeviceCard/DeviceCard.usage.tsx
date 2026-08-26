/**
 * USAGE — DeviceCard
 *
 * "Garage Sensor" is in an error/no-response state — its switch is replaced
 * with "Unavailable" text rather than a switch a tap could silently fail
 * against.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { SmartDevice } from '../types/domain';
import { DeviceCard } from './DeviceCard';
import sample from './DeviceCard.sample.json';

const { devices: initial } = loadSample<{ devices: SmartDevice[] }>(sample);

export const DeviceCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [devices, setDevices] = useState(initial);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = (device: SmartDevice, next: boolean) => {
    setTogglingId(device.id);
    setTimeout(() => {
      setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, powerState: next ? 'on' : 'off' } : d)));
      setTogglingId(null);
      toast.show(`${device.name} turned ${next ? 'on' : 'off'}`);
    }, 600);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          toggling={togglingId === device.id}
          onPress={(item) => toast.show(`Opening ${item.name}`)}
          onToggle={handleToggle}
          onMore={(item) => toast.show(`Options for ${item.name}`)}
        />
      ))}
    </ScrollView>
  );
};
