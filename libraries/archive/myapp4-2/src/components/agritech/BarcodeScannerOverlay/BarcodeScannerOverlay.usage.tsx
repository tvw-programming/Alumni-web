import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';

import { BarcodeScannerOverlay } from './BarcodeScannerOverlay';
import sample from './BarcodeScannerOverlay.sample.json';
import { loadSample } from '../types/sample';

const DATA = loadSample<{ expectedCodes: string[]; title: string }>(sample);

export const BarcodeScannerOverlayUsage = () => {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [lastCode, setLastCode] = useState<string | undefined>(undefined);

  return (
    <View style={{ flex: 1, padding: theme.spacing.md }}>
      {lastCode ? (
        <Text variant="bodyMedium" style={{ marginBottom: theme.spacing.sm }}>
          Last scanned: {lastCode}
        </Text>
      ) : null}
      <AppButton variant="primary" size="md" onPress={() => setVisible(true)}>
        Open scanner
      </AppButton>
      <BarcodeScannerOverlay
        visible={visible}
        expectedCodes={DATA.expectedCodes}
        title={DATA.title}
        onDetected={(result) => {
          setLastCode(result.code);
          setVisible(false);
        }}
        onManualEntry={(code) => setLastCode(code)}
        onClose={() => setVisible(false)}
      />
    </View>
  );
};
