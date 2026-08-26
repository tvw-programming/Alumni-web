/**
 * USAGE — DownloadStatusButton
 *
 * The button never starts a transfer itself — every tap here just calls the
 * matching intent (`onStart`, `onPause`, …) and the usage layer stands in for
 * the download manager updating durable status.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { DownloadStatus } from '../types/domain';
import { DownloadStatusButton } from './DownloadStatusButton';
import sample from './DownloadStatusButton.sample.json';

interface Item {
  title: string;
  status: DownloadStatus;
  progress?: number;
}

const { buttons: initial } = loadSample<{ buttons: Item[] }>(sample);

export const DownloadStatusButtonUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [buttons, setButtons] = useState(initial);

  const update = (title: string, patch: Partial<Item>) => setButtons((prev) => prev.map((b) => (b.title === title ? { ...b, ...patch } : b)));

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {buttons.map((item) => (
        <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Text variant="bodyMedium" style={{ flex: 1 }}>
            {item.title}
          </Text>
          <DownloadStatusButton
            title={item.title}
            status={item.status}
            progress={item.progress}
            onStart={() => {
              update(item.title, { status: 'downloading', progress: 0.1 });
              toast.show(`Downloading ${item.title}…`);
            }}
            onPause={() => update(item.title, { status: 'paused' })}
            onResume={() => update(item.title, { status: 'downloading' })}
            onRemove={() => {
              update(item.title, { status: 'idle', progress: undefined });
              toast.show(`Removed download for ${item.title}`);
            }}
            onRetry={() => update(item.title, { status: 'downloading', progress: 0.1 })}
          />
        </View>
      ))}
    </ScrollView>
  );
};
