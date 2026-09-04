/**
 * USAGE — MatchmakingDialog
 *
 * The cancellation-penalty note is shown before the cancel button is tapped,
 * not after — the consequence is explained while it's still avoidable.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MatchmakingModel } from '../types/domain';
import { MatchmakingDialog } from './MatchmakingDialog';
import rawSample from './MatchmakingDialog.sample.json';

const sample = loadSample<Record<'searching' | 'matchFound' | 'timeout' | 'error', MatchmakingModel>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'searching', label: 'Searching' },
  { value: 'matchFound', label: 'Found' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'error', label: 'Error' },
];

export const MatchmakingDialogUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('searching');
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <AppButton variant="primary" onPress={() => setVisible(true)}>
        Find match
      </AppButton>

      <MatchmakingDialog
        visible={visible}
        model={sample[scenario]}
        onCancel={() => {
          setVisible(false);
          toast.show('Search canceled');
        }}
        onRetry={() => toast.show('Searching again…')}
        onAcceptMatch={() => {
          setVisible(false);
          toast.success('Match accepted');
        }}
        onDismiss={() => setVisible(false)}
      />
    </View>
  );
};
