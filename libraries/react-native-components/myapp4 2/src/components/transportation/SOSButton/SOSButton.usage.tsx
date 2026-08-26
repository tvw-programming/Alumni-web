/**
 * USAGE — SOSButton
 *
 * Tapping "Emergency help" never dials immediately — it opens a confirmation
 * step that states exactly what happens (location shared with responders)
 * before the call is placed.
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { SafetyContext } from '../types/domain';
import { SOSButton } from './SOSButton';
import sample from './SOSButton.sample.json';

const { context } = loadSample<{ context: SafetyContext }>(sample);

export const SOSButtonUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelMedium">Button variant</Text>
        <SOSButton
          context={context}
          variant="button"
          onSOS={() => toast.success('Emergency services contacted. Location shared.')}
          onShareTrip={() => toast.show('Trip shared with your emergency contact')}
          onReport={() => toast.show('Opening safety report')}
          onCallSupport={() => toast.show('Connecting to support')}
        />
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelMedium">Icon variant (e.g. trip header)</Text>
        <SOSButton context={context} variant="icon" onSOS={() => toast.success('Emergency services contacted.')} onShareTrip={() => toast.show('Trip shared')} />
      </View>
    </View>
  );
};
