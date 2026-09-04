import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { AdvisoryAlertBanner } from './AdvisoryAlertBanner';
import sample from './AdvisoryAlertBanner.sample.json';
import { loadSample } from '../types/sample';
import type { AdvisoryAlert } from '../types/domain';

const ALERTS = loadSample<{ alerts: AdvisoryAlert[] }>(sample).alerts;

export const AdvisoryAlertBannerUsage = () => {
  const theme = useAppTheme();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {ALERTS.filter((a) => !dismissedIds.includes(a.id)).map((alert) => (
        <View key={alert.id}>
          <AdvisoryAlertBanner
            alert={alert}
            onAction={() => {}}
            onDismiss={(a) => setDismissedIds((prev) => [...prev, a.id])}
            onSnooze={(a) => setDismissedIds((prev) => [...prev, a.id])}
            onListen={() => {}}
          />
        </View>
      ))}
    </ScrollView>
  );
};
