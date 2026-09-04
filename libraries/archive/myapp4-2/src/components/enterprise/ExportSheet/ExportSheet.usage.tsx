/**
 * USAGE — ExportSheet
 *
 * Generation is asynchronous and status-driven — the sheet never claims
 * "Download ready" until this usage layer (standing in for the export
 * service) actually reports a completed status.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ExportConfig, ExportFormat, ExportScopeOption, ExportStatus } from '../types/domain';
import { ExportSheet } from './ExportSheet';
import sample from './ExportSheet.sample.json';

const data = loadSample<{ formats: ExportFormat[]; scopeOptions: ExportScopeOption[] }>(sample);

export const ExportSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);

  const handleConfirm = (config: ExportConfig) => {
    setStatus('generating');
    setProgress(0.2);
    setTimeout(() => setProgress(0.7), 500);
    setTimeout(() => {
      setStatus('complete');
      toast.success(`Export ready: ${config.formatId.toUpperCase()}`);
    }, 1200);
  };

  return (
    <View style={{ padding: theme.spacing.md }}>
      <AppButton
        variant="primary"
        onPress={() => {
          setStatus('idle');
          setVisible(true);
        }}
      >
        Export data
      </AppButton>

      <ExportSheet
        visible={visible}
        formats={data.formats}
        scopeOptions={data.scopeOptions}
        status={status}
        progress={progress}
        downloadUrl="https://exports.example.com/signed/abc123"
        onConfirm={handleConfirm}
        onDismiss={() => setVisible(false)}
        onOpenDownload={() => {
          setVisible(false);
          toast.show('Opening download');
        }}
      />
    </View>
  );
};
