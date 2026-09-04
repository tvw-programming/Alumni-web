import React, { useState } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { DevicePairingWizard } from './DevicePairingWizard';
import sample from './DevicePairingWizard.sample.json';
import { loadSample } from '../types/sample';
import type { DeviceCandidate, DeviceConfig, PairingError, PairingState } from '../types/domain';

const DATA = loadSample<{ candidates: DeviceCandidate[]; rooms: string[]; config: DeviceConfig; error: PairingError }>(sample);

export const DevicePairingWizardUsage = () => {
  const theme = useAppTheme();
  const [state, setState] = useState<PairingState>('idle');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>(undefined);
  const [config, setConfig] = useState<DeviceConfig>(DATA.config);
  const [failNext, setFailNext] = useState(true);

  const startScan = () => {
    setState('requestingPermission');
    setTimeout(() => setState('scanning'), 500);
    setTimeout(() => setState('discovering'), 1400);
  };

  const connect = () => {
    setState('connecting');
    setTimeout(() => {
      if (failNext) {
        setFailNext(false);
        setState('error');
      } else {
        setState('configuring');
      }
    }, 1200);
  };

  const submitConfig = () => {
    setState('success');
  };

  const reset = () => {
    setState('idle');
    setSelectedCandidateId(undefined);
    setConfig({ name: '' });
  };

  return (
    <View style={{ flex: 1, padding: theme.spacing.md }}>
      <DevicePairingWizard
        state={state}
        candidates={state === 'discovering' || state === 'error' ? DATA.candidates : []}
        selectedCandidateId={selectedCandidateId}
        error={state === 'error' ? DATA.error : undefined}
        config={config}
        rooms={DATA.rooms}
        onStartScan={startScan}
        onUseManualCode={() => setState('discovering')}
        onSelectCandidate={(c) => setSelectedCandidateId(c.id)}
        onConnect={connect}
        onConfigChange={setConfig}
        onConfigSubmit={submitConfig}
        onRetry={() => setState('discovering')}
        onCancel={reset}
        onFinish={reset}
      />
    </View>
  );
};
