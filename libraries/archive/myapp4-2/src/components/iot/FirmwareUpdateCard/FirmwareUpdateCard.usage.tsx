import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { FirmwareUpdateCard } from './FirmwareUpdateCard';
import sample from './FirmwareUpdateCard.sample.json';
import { loadSample } from '../types/sample';
import type { FirmwareStatus } from '../types/domain';

interface FirmwareSample {
  deviceName: string;
  currentVersion: string;
  availableVersion?: string;
  status: FirmwareStatus;
  downloadProgress?: number;
  releaseNotes?: string;
  blockedReason?: string;
}

const DEVICES = loadSample<{ devices: FirmwareSample[] }>(sample).devices;

export const FirmwareUpdateCardUsage = () => {
  const theme = useAppTheme();
  const [devices, setDevices] = useState(DEVICES);

  const runInstall = (name: string) => {
    setDevices((prev) => prev.map((d) => (d.deviceName === name ? { ...d, status: 'downloading', downloadProgress: 0 } : d)));

    let progress = 0;
    const downloadInterval = setInterval(() => {
      progress += 0.25;
      if (progress >= 1) {
        clearInterval(downloadInterval);
        setDevices((prev) => prev.map((d) => (d.deviceName === name ? { ...d, status: 'installing', downloadProgress: 1 } : d)));
        setTimeout(() => {
          setDevices((prev) => prev.map((d) => (d.deviceName === name ? { ...d, status: 'restarting' } : d)));
          setTimeout(() => {
            setDevices((prev) => prev.map((d) => (d.deviceName === name ? { ...d, status: 'success', currentVersion: d.availableVersion ?? d.currentVersion } : d)));
          }, 1200);
        }, 1200);
      } else {
        setDevices((prev) => prev.map((d) => (d.deviceName === name ? { ...d, downloadProgress: progress } : d)));
      }
    }, 500);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {devices.map((device) => (
        <View key={device.deviceName}>
          <FirmwareUpdateCard
            deviceName={device.deviceName}
            currentVersion={device.currentVersion}
            availableVersion={device.availableVersion}
            status={device.status}
            downloadProgress={device.downloadProgress}
            releaseNotes={device.releaseNotes}
            blockedReason={device.blockedReason}
            onInstall={() => runInstall(device.deviceName)}
            onDismiss={() => {}}
          />
        </View>
      ))}
    </ScrollView>
  );
};
