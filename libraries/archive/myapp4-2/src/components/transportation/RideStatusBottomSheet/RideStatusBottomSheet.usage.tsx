/**
 * USAGE — RideStatusBottomSheet
 *
 * The "reconnecting" scenario keeps the last known driver visible with an
 * honest "reconnecting" banner instead of clearing the sheet.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RideStatusModel } from '../types/domain';
import { RideStatusBottomSheet } from './RideStatusBottomSheet';
import rawSample from './RideStatusBottomSheet.sample.json';

const sample = loadSample<Record<'searching' | 'driverArriving' | 'reconnecting' | 'failed', RideStatusModel>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'searching', label: 'Searching' },
  { value: 'driverArriving', label: 'Arriving' },
  { value: 'reconnecting', label: 'Reconnecting' },
  { value: 'failed', label: 'Failed' },
];

export const RideStatusBottomSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('driverArriving');
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <AppButton variant="primary" onPress={() => setVisible(true)}>
        Show ride status
      </AppButton>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Status comes from the sample trip-service payload — the sheet never infers it from a moving marker.
      </Text>

      <RideStatusBottomSheet
        visible={visible}
        onDismiss={() => setVisible(false)}
        model={sample[scenario]}
        onCall={() => toast.show('Calling via masked number…')}
        onChat={() => toast.show('Opening chat')}
        onShare={() => toast.show('Sharing trip')}
        onSafety={() => toast.show('Opening Safety Centre')}
        onCancel={() => {
          setVisible(false);
          toast.show(scenario === 'failed' ? 'Searching again…' : 'Ride canceled');
        }}
        onSupport={() => toast.show('Opening support')}
      />
    </View>
  );
};
